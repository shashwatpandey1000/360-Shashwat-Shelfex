import { eq, and, or, ilike, desc, asc, count, isNull, inArray, sql } from 'drizzle-orm';
import { db } from '../db';
import {
  users,
  userPermissions,
  userDataScopes,
  roleTemplates,
  roleTemplatePermissions,
  stores,
} from '../db/schema';
import { sendEmployeeInviteEmail } from './email.service';
import type { AccessMap } from './accessMap.service';
import type {
  CreateEmployeeInput,
  UpdateEmployeeInput,
  ListEmployeesQuery,
} from '../validations/employee.validation';
import { PERMISSIONS } from '../utils/permissions';

// Role hierarchy: which roles a given caller roleTemplate is allowed to create
const CREATABLE_ROLES: Record<string, string[]> = {
  org_manager: ['org_manager', 'zone_manager', 'store_manager', 'surveyor'],
  zone_manager: ['store_manager', 'surveyor'],
  store_manager: ['surveyor'],
  surveyor: [],
};

// Create an employee (invited user — sso_user_id = null until they register on SSO)
export async function createEmployee(
  orgId: string,
  input: CreateEmployeeInput,
  createdBy: string,
  callerRoleTemplate: string,
  orgName?: string,
) {
  // Enforce role hierarchy — prevent privilege escalation
  const allowed = CREATABLE_ROLES[callerRoleTemplate] ?? [];
  if (!allowed.includes(input.roleTemplate)) {
    throw new Error(
      `A ${callerRoleTemplate} cannot create a user with role ${input.roleTemplate}`,
    );
  }

  // Enforce scope bounds — caller cannot grant broader scope than their own
  // org_manager can grant any scope; zone/store managers cannot grant org-wide access
  if (callerRoleTemplate === 'store_manager') {
    if (input.scopeType !== 'stores') {
      throw new Error('Store managers can only invite users with store-level scope');
    }
    // Validate that all store IDs being granted are within the caller's own stores
    if (input.scopeEntityIds && input.scopeEntityIds.length > 0) {
      const callerUser = await db
        .select({ scopeEntityId: userDataScopes.scopeEntityId })
        .from(userDataScopes)
        .where(eq(userDataScopes.userId, createdBy));
      const callerStoreIds = new Set(callerUser.map((r) => r.scopeEntityId));
      const outOfScope = input.scopeEntityIds.filter((id) => !callerStoreIds.has(id));
      if (outOfScope.length > 0) {
        throw new Error('You can only assign stores within your own scope');
      }
    }
  } else if (callerRoleTemplate === 'zone_manager') {
    if (input.scopeType === 'org') {
      throw new Error('Zone managers cannot grant organization-wide access');
    }
  }

  // Check if email already exists in this org
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.orgId, orgId), eq(users.email, input.email)))
    .limit(1);

  if (existing) {
    throw new Error('A user with this email already exists in your organization');
  }

  // Get the role template + its permissions
  const [template] = await db
    .select()
    .from(roleTemplates)
    .where(and(eq(roleTemplates.name, input.roleTemplate), isNull(roleTemplates.orgId)))
    .limit(1);

  if (!template) {
    throw new Error(`Role template "${input.roleTemplate}" not found`);
  }

  const templatePerms = await db
    .select({ permission: roleTemplatePermissions.permission })
    .from(roleTemplatePermissions)
    .where(eq(roleTemplatePermissions.roleTemplateId, template.id));

  // Create user (sso_user_id = null — will be linked when they register on SSO)
  const [user] = await db
    .insert(users)
    .values({
      ssoUserId: null,
      orgId,
      email: input.email,
      name: input.name,
      phone: input.phone || null,
      roleTemplate: input.roleTemplate,
      scopeType: input.scopeType,
      status: 'pending_first_login',
      createdBy,
    })
    .returning();

  // Copy permissions from role template
  if (templatePerms.length > 0) {
    await db.insert(userPermissions).values(
      templatePerms.map((p) => ({
        userId: user.id,
        permission: p.permission,
      })),
    );
  }

  // Set data scopes (if zones or stores)
  if (input.scopeType !== 'org' && input.scopeEntityIds && input.scopeEntityIds.length > 0) {
    await db.insert(userDataScopes).values(
      input.scopeEntityIds.map((entityId) => ({
        userId: user.id,
        scopeEntityId: entityId,
      })),
    );
  }

  // Send invite email (non-blocking)
  const ssoUrl = process.env.SSO_FRONTEND_URL || 'https://accounts.shelfexecution.com';
  const roleName = template.displayName;
  sendEmployeeInviteEmail(
    input.email,
    input.name,
    orgName || 'your organization',
    roleName,
    ssoUrl,
  );

  return user;
}

// List employees with search, filters, pagination — scoped by access map
export async function listEmployees(orgId: string, query: ListEmployeesQuery, accessMap: AccessMap) {
  const { page, perPage, search, roleTemplate, status, storeId, sortBy, sortOrder } = query;
  const offset = (page - 1) * perPage;

  const conditions = [eq(users.orgId, orgId)];

  // If a specific storeId filter is provided, only return employees scoped to that store
  if (storeId) {
    const storeUserRows = await db
      .select({ userId: userDataScopes.userId })
      .from(userDataScopes)
      .where(eq(userDataScopes.scopeEntityId, storeId));
    const storeUserIds = storeUserRows.map((r) => r.userId);
    // Also include the store manager (who may have org scope and not appear in user_data_scopes)
    const [storeRecord] = await db
      .select({ managerId: stores.managerId })
      .from(stores)
      .where(and(eq(stores.orgId, orgId), eq(stores.id, storeId)))
      .limit(1);
    if (storeRecord?.managerId && !storeUserIds.includes(storeRecord.managerId)) {
      storeUserIds.push(storeRecord.managerId);
    }
    if (storeUserIds.length > 0) {
      conditions.push(inArray(users.id, storeUserIds));
    } else {
      // No employees scoped to this store — return empty
      return { data: [], total: 0, page, perPage, totalPages: 0 };
    }
  }

  // Data scope: store-scoped users only see employees who share at least one of their stores
  if (accessMap.scopeType === 'stores' && accessMap.dataScope.storeIds?.length) {
    const storeIds = accessMap.dataScope.storeIds;
    // Get user IDs who have any of these stores in their data scopes
    const scopedUserRows = await db
      .select({ userId: userDataScopes.userId })
      .from(userDataScopes)
      .where(inArray(userDataScopes.scopeEntityId, storeIds));
    const scopedUserIds = [...new Set(scopedUserRows.map((r) => r.userId))];
    // Also include the requesting user themselves
    if (!scopedUserIds.includes(accessMap.userId)) scopedUserIds.push(accessMap.userId);
    if (scopedUserIds.length > 0) {
      conditions.push(inArray(users.id, scopedUserIds));
    }
  } else if (accessMap.scopeType === 'zones' && accessMap.dataScope.zoneIds?.length) {
    const zoneIds = accessMap.dataScope.zoneIds;
    // Get stores in these zones, then get users scoped to those stores
    const zoneStores = await db
      .select({ id: stores.id })
      .from(stores)
      .where(and(eq(stores.orgId, orgId), inArray(stores.zoneId, zoneIds)));
    const zoneStoreIds = zoneStores.map((s) => s.id);
    if (zoneStoreIds.length > 0) {
      const scopedUserRows = await db
        .select({ userId: userDataScopes.userId })
        .from(userDataScopes)
        .where(inArray(userDataScopes.scopeEntityId, zoneStoreIds));
      const scopedUserIds = [...new Set(scopedUserRows.map((r) => r.userId))];
      if (!scopedUserIds.includes(accessMap.userId)) scopedUserIds.push(accessMap.userId);
      if (scopedUserIds.length > 0) {
        conditions.push(inArray(users.id, scopedUserIds));
      }
    }
  }
  // org scope → no additional filter, sees all employees in org

  if (roleTemplate) {
    conditions.push(eq(users.roleTemplate, roleTemplate));
  }

  if (status) {
    conditions.push(eq(users.status, status));
  }

  if (search) {
    conditions.push(or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`))!);
  }

  const where = and(...conditions);

  const orderByMap: Record<string, any> = {
    name: users.name,
    email: users.email,
    createdAt: users.createdAt,
    roleTemplate: users.roleTemplate,
  };
  const orderCol = orderByMap[sortBy] || users.createdAt;
  const orderFn = sortOrder === 'asc' ? asc : desc;

  const [data, [{ total }]] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        phone: users.phone,
        roleTemplate: users.roleTemplate,
        scopeType: users.scopeType,
        status: users.status,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(where)
      .orderBy(orderFn(orderCol))
      .limit(perPage)
      .offset(offset),
    db.select({ total: count() }).from(users).where(where),
  ]);

  return {
    data,
    total: Number(total),
    page,
    perPage,
    totalPages: Math.ceil(Number(total) / perPage),
  };
}

// Get employee by ID (with permissions + scopes) — scoped by access map
export async function getEmployeeById(orgId: string, employeeId: string, accessMap?: AccessMap) {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.orgId, orgId), eq(users.id, employeeId)))
    .limit(1);

  if (!user) return null;

  // Scope check: store/zone managers can only view employees in their scope
  if (accessMap && accessMap.scopeType !== 'org') {
    // Always allow viewing yourself
    if (user.id !== accessMap.userId) {
      const targetScopes = await db
        .select({ scopeEntityId: userDataScopes.scopeEntityId })
        .from(userDataScopes)
        .where(eq(userDataScopes.userId, employeeId));
      const targetScopeIds = targetScopes.map((s) => s.scopeEntityId);

      let hasOverlap = false;
      if (accessMap.scopeType === 'stores' && accessMap.dataScope.storeIds?.length) {
        hasOverlap = targetScopeIds.some((id) => accessMap.dataScope.storeIds!.includes(id));
      } else if (accessMap.scopeType === 'zones' && accessMap.dataScope.zoneIds?.length) {
        // Resolve zone store IDs
        const zoneStores = await db
          .select({ id: stores.id })
          .from(stores)
          .where(and(eq(stores.orgId, orgId), inArray(stores.zoneId, accessMap.dataScope.zoneIds)));
        const zoneStoreIds = zoneStores.map((s) => s.id);
        hasOverlap = targetScopeIds.some((id) => zoneStoreIds.includes(id));
      }

      if (!hasOverlap) return null;
    }
  }

  const perms = await db
    .select({ permission: userPermissions.permission })
    .from(userPermissions)
    .where(eq(userPermissions.userId, employeeId));

  const scopes = await db
    .select({ scopeEntityId: userDataScopes.scopeEntityId })
    .from(userDataScopes)
    .where(eq(userDataScopes.userId, employeeId));

  return {
    ...user,
    permissions: perms.map((p) => p.permission),
    scopeEntityIds: scopes.map((s) => s.scopeEntityId),
  };
}

// Update employee (role, scope, basic info)
export async function updateEmployee(
  orgId: string,
  employeeId: string,
  input: UpdateEmployeeInput,
) {
  const [existing] = await db
    .select()
    .from(users)
    .where(and(eq(users.orgId, orgId), eq(users.id, employeeId)))
    .limit(1);

  if (!existing) return null;

  // Update basic user fields
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name !== undefined) updateData.name = input.name;
  if (input.phone !== undefined) updateData.phone = input.phone || null;

  // If custom permissions array is provided → write them directly
  if (input.permissions !== undefined) {
    // Validate all permissions are valid
    const validPerms = input.permissions.filter((p) =>
      (PERMISSIONS as readonly string[]).includes(p),
    );

    // Delete old permissions, insert new
    await db.delete(userPermissions).where(eq(userPermissions.userId, employeeId));
    if (validPerms.length > 0) {
      await db.insert(userPermissions).values(
        validPerms.map((p) => ({
          userId: employeeId,
          permission: p,
        })),
      );
    }
    updateData.permissionsVersion = sql`${users.permissionsVersion} + 1`;
  } else if (input.roleTemplate && input.roleTemplate !== existing.roleTemplate) {
    // If role template changed → rewrite permissions from template
    updateData.roleTemplate = input.roleTemplate;

    // Get new template permissions
    const [template] = await db
      .select()
      .from(roleTemplates)
      .where(and(eq(roleTemplates.name, input.roleTemplate), isNull(roleTemplates.orgId)))
      .limit(1);

    if (template) {
      const templatePerms = await db
        .select({ permission: roleTemplatePermissions.permission })
        .from(roleTemplatePermissions)
        .where(eq(roleTemplatePermissions.roleTemplateId, template.id));

      // Delete old permissions, insert new
      await db.delete(userPermissions).where(eq(userPermissions.userId, employeeId));
      if (templatePerms.length > 0) {
        await db.insert(userPermissions).values(
          templatePerms.map((p) => ({
            userId: employeeId,
            permission: p.permission,
          })),
        );
      }
    }
    updateData.permissionsVersion = sql`${users.permissionsVersion} + 1`;
  }

  // If scope changed → rewrite scopes
  if (input.scopeType !== undefined) {
    updateData.scopeType = input.scopeType;
    // Delete old scopes
    await db.delete(userDataScopes).where(eq(userDataScopes.userId, employeeId));
    // Insert new scopes
    if (input.scopeType !== 'org' && input.scopeEntityIds && input.scopeEntityIds.length > 0) {
      await db.insert(userDataScopes).values(
        input.scopeEntityIds.map((entityId) => ({
          userId: employeeId,
          scopeEntityId: entityId,
        })),
      );
    }
  }

  const [updated] = await db
    .update(users)
    .set(updateData)
    .where(and(eq(users.orgId, orgId), eq(users.id, employeeId)))
    .returning();

  return updated || null;
}

// Deactivate employee
export async function deactivateEmployee(orgId: string, employeeId: string) {
  const [updated] = await db
    .update(users)
    .set({ status: 'inactive', updatedAt: new Date() })
    .where(and(eq(users.orgId, orgId), eq(users.id, employeeId)))
    .returning();

  // If this person was a store manager, clear their assignment
  if (updated) {
    await db
      .update(stores)
      .set({ managerId: null, updatedAt: new Date() })
      .where(and(eq(stores.orgId, orgId), eq(stores.managerId, employeeId)));
  }

  return updated || null;
}

// Reactivate employee
export async function reactivateEmployee(orgId: string, employeeId: string) {
  const [updated] = await db
    .update(users)
    .set({ status: 'active', updatedAt: new Date() })
    .where(and(eq(users.orgId, orgId), eq(users.id, employeeId)))
    .returning();

  return updated || null;
}

// Assign store manager
export async function assignStoreManager(orgId: string, storeId: string, employeeId: string) {
  // Verify employee exists, is in same org, and is a store_manager
  const [employee] = await db
    .select({ id: users.id, roleTemplate: users.roleTemplate, status: users.status })
    .from(users)
    .where(and(eq(users.orgId, orgId), eq(users.id, employeeId)))
    .limit(1);

  if (!employee) throw new Error('Employee not found');
  if (employee.status === 'inactive') throw new Error('Employee is inactive');

  // Verify store exists
  const [store] = await db
    .select({ id: stores.id })
    .from(stores)
    .where(and(eq(stores.orgId, orgId), eq(stores.id, storeId)))
    .limit(1);

  if (!store) throw new Error('Store not found');

  // Update store manager
  const [updated] = await db
    .update(stores)
    .set({ managerId: employeeId, updatedAt: new Date() })
    .where(eq(stores.id, storeId))
    .returning();

  return updated || null;
}
