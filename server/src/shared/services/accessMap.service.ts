import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users, userPermissions, userDataScopes, organizations } from '../db/schema';
import type { Permission } from '../utils/permissions';

// Access map shape — returned to client, attached to every request
export interface AccessMap {
  userId: string;
  orgId: string;
  orgStatus: string;
  orgRejectedAt: string | null;
  orgRejectionReason: string | null;
  roleTemplate: string;
  scopeType: 'org' | 'zones' | 'stores';
  dataScope: {
    zoneIds?: string[];
    storeIds?: string[];
  };
  permissions: Permission[];
  modules: string[];
  permissionsVersion: number;
}

// Build access map for a user from DB
export async function buildAccessMap(userId: string): Promise<AccessMap | null> {
  // 1. Get user + org status
  const [user] = await db
    .select({
      id: users.id,
      orgId: users.orgId,
      roleTemplate: users.roleTemplate,
      scopeType: users.scopeType,
      permissionsVersion: users.permissionsVersion,
      orgStatus: organizations.status,
      orgRejectedAt: organizations.rejectedAt,
      orgRejectionReason: organizations.rejectionReason,
    })
    .from(users)
    .innerJoin(organizations, eq(users.orgId, organizations.id))
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return null;

  // 2. Get permissions
  const permRows = await db
    .select({ permission: userPermissions.permission })
    .from(userPermissions)
    .where(eq(userPermissions.userId, userId));

  const permissions = permRows.map((r) => r.permission) as Permission[];

  // 3. Get data scopes (empty for org-level users)
  const scopeRows = await db
    .select({ scopeEntityId: userDataScopes.scopeEntityId })
    .from(userDataScopes)
    .where(eq(userDataScopes.userId, userId));

  const scopeIds = scopeRows.map((r) => r.scopeEntityId);

  // 4. Build data scope object
  const dataScope: AccessMap['dataScope'] = {};
  if (user.scopeType === 'zones') {
    dataScope.zoneIds = scopeIds;
  } else if (user.scopeType === 'stores') {
    dataScope.storeIds = scopeIds;
  }
  // org scope = empty object (full access implied)

  // 5. Derive modules from permissions (unique resource prefixes)
  const modules = [...new Set(permissions.map((p) => p.split(':')[0]))];

  return {
    userId: user.id,
    orgId: user.orgId,
    orgStatus: user.orgStatus,
    orgRejectedAt: user.orgRejectedAt ? user.orgRejectedAt.toISOString() : null,
    orgRejectionReason: user.orgRejectionReason ?? null,
    roleTemplate: user.roleTemplate,
    scopeType: user.scopeType as AccessMap['scopeType'],
    dataScope,
    permissions,
    modules,
    permissionsVersion: user.permissionsVersion,
  };
}

// Look up 360 user by SSO user ID
export async function findUserBySsoId(ssoUserId: string) {
  const [user] = await db.select().from(users).where(eq(users.ssoUserId, ssoUserId)).limit(1);

  return user || null;
}

// Look up 360 user by email (for account linking — invited users with sso_user_id = null)
export async function findUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  return user || null;
}

// Link an invited 360 user to their SSO account (sets sso_user_id, activates account)
export async function linkSsoAccount(userId: string, ssoUserId: string) {
  const [updated] = await db
    .update(users)
    .set({
      ssoUserId,
      status: 'active',
      lastLoginAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  return updated || null;
}

// Mark first login once (idempotent by where last_login_at IS NULL)
export async function markFirstLogin(userId: string) {
  const [updated] = await db
    .update(users)
    .set({
      status: 'active',
      lastLoginAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id });

  return updated || null;
}
