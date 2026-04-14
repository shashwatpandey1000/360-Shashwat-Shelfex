import { eq, and, or, ilike, desc, asc, count, isNull } from 'drizzle-orm';
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
import type { CreateEmployeeInput, UpdateEmployeeInput, ListEmployeesQuery } from '../validations/employee.validation';

// Create an employee (invited user — sso_user_id = null until they register on SSO)
export async function createEmployee(orgId: string, input: CreateEmployeeInput, createdBy: string, orgName?: string) {
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
  const ssoUrl = process.env.SSO_FRONTEND_URL || 'https://sso-front-zeta.vercel.app';
  const roleName = template.displayName;
  sendEmployeeInviteEmail(input.email, input.name, orgName || 'your organization', roleName, ssoUrl);

  return user;
}

// List employees with search, filters, pagination
export async function listEmployees(orgId: string, query: ListEmployeesQuery) {
  const { page, perPage, search, roleTemplate, status, sortBy, sortOrder } = query;
  const offset = (page - 1) * perPage;

  const conditions = [eq(users.orgId, orgId)];

  if (roleTemplate) {
    conditions.push(eq(users.roleTemplate, roleTemplate));
  }

  if (status) {
    conditions.push(eq(users.status, status));
  }

  if (search) {
    conditions.push(
      or(
        ilike(users.name, `%${search}%`),
        ilike(users.email, `%${search}%`),
      )!,
    );
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

// Get employee by ID (with permissions + scopes)
export async function getEmployeeById(orgId: string, employeeId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.orgId, orgId), eq(users.id, employeeId)))
    .limit(1);

  if (!user) return null;

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
export async function updateEmployee(orgId: string, employeeId: string, input: UpdateEmployeeInput) {
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

  // If role template changed → rewrite permissions
  if (input.roleTemplate && input.roleTemplate !== existing.roleTemplate) {
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
