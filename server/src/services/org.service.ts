import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../db';
import {
  organizations,
  users,
  roleTemplates,
  roleTemplatePermissions,
  userPermissions,
  superAdmins,
} from '../db/schema';
import type { RegisterOrgInput } from '../validations/org.validation';

// Generate URL-safe slug from org name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

// Ensure slug is unique by appending a short suffix if needed
async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let attempt = 0;

  while (true) {
    const [existing] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, slug))
      .limit(1);

    if (!existing) return slug;

    attempt++;
    slug = `${base}-${attempt}`;
  }
}

// Register a new org + create the first user (org_manager) with full permissions
export async function registerOrg(input: RegisterOrgInput, ssoUserId: string, email: string) {
  const slug = await uniqueSlug(generateSlug(input.orgName));

  // Get the system org_manager role template + its permissions
  const [orgManagerTemplate] = await db
    .select()
    .from(roleTemplates)
    .where(and(eq(roleTemplates.name, 'org_manager'), isNull(roleTemplates.orgId)))
    .limit(1);

  if (!orgManagerTemplate) {
    throw new Error('System role template "org_manager" not found. Run the seed script.');
  }

  const templatePerms = await db
    .select({ permission: roleTemplatePermissions.permission })
    .from(roleTemplatePermissions)
    .where(eq(roleTemplatePermissions.roleTemplateId, orgManagerTemplate.id));

  // Create org + user + permissions in a single transaction
  // Neon HTTP driver doesn't support transactions natively, so we do sequential inserts
  // In production with a pooled connection, wrap this in a transaction

  // 1. Create the organization
  const [org] = await db
    .insert(organizations)
    .values({
      name: input.orgName,
      slug,
      type: input.orgType,
      status: 'pending_approval',
      industryId: input.industryId,
      country: input.country,
      currency: input.currency,
      timezone: input.timezone,
      website: input.website || null,
      contactEmail: email,
      contactPhone: input.contactPhone || null,
      hqAddress: input.hqAddress || null,
      createdBy: ssoUserId,
    })
    .returning();

  // 2. Create the first user (org_manager)
  const [user] = await db
    .insert(users)
    .values({
      ssoUserId,
      orgId: org.id,
      email,
      roleTemplate: 'org_manager',
      scopeType: 'org', // org managers see everything
      status: 'active',
    })
    .returning();

  // 3. Copy all org_manager permissions to the user
  if (templatePerms.length > 0) {
    await db.insert(userPermissions).values(
      templatePerms.map((p) => ({
        userId: user.id,
        permission: p.permission,
      })),
    );
  }

  return { org, user };
}

// Get org by ID
export async function getOrgById(orgId: string) {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  return org || null;
}

// List orgs pending approval (for super admin)
export async function listPendingOrgs() {
  return db
    .select()
    .from(organizations)
    .where(eq(organizations.status, 'pending_approval'))
    .orderBy(organizations.createdAt);
}

// Approve an org
export async function approveOrg(orgId: string, superAdminId: string) {
  const [updated] = await db
    .update(organizations)
    .set({
      status: 'active',
      approvedBy: superAdminId,
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(organizations.id, orgId), eq(organizations.status, 'pending_approval')))
    .returning();

  return updated || null;
}

// Reject an org
export async function rejectOrg(orgId: string, reason: string) {
  const [updated] = await db
    .update(organizations)
    .set({
      status: 'rejected',
      rejectedAt: new Date(),
      rejectionReason: reason,
      updatedAt: new Date(),
    })
    .where(and(eq(organizations.id, orgId), eq(organizations.status, 'pending_approval')))
    .returning();

  return updated || null;
}

// Get org settings (full org record for the settings page)
export async function getOrgSettings(orgId: string) {
  const [org] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      type: organizations.type,
      status: organizations.status,
      industryId: organizations.industryId,
      country: organizations.country,
      currency: organizations.currency,
      timezone: organizations.timezone,
      defaultLanguage: organizations.defaultLanguage,
      logoUrl: organizations.logoUrl,
      website: organizations.website,
      hqAddress: organizations.hqAddress,
      contactEmail: organizations.contactEmail,
      contactPhone: organizations.contactPhone,
      settings: organizations.settings,
    })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  return org || null;
}

// Update org settings
export async function updateOrgSettings(
  orgId: string,
  data: Record<string, unknown>,
) {
  // Build the update object — only include fields that were provided
  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (data.name !== undefined) updateData.name = data.name;
  if (data.website !== undefined) updateData.website = data.website || null;
  if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone || null;
  if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl || null;
  if (data.country !== undefined) updateData.country = data.country;
  if (data.currency !== undefined) updateData.currency = data.currency;
  if (data.timezone !== undefined) updateData.timezone = data.timezone;
  if (data.defaultLanguage !== undefined) updateData.defaultLanguage = data.defaultLanguage;
  if (data.industryId !== undefined) updateData.industryId = data.industryId;
  if (data.hqAddress !== undefined) updateData.hqAddress = data.hqAddress;
  if (data.settings !== undefined) updateData.settings = data.settings;

  const [updated] = await db
    .update(organizations)
    .set(updateData)
    .where(eq(organizations.id, orgId))
    .returning();

  return updated || null;
}

// Check if a user is a super admin
export async function findSuperAdmin(ssoUserId: string) {
  const [admin] = await db
    .select()
    .from(superAdmins)
    .where(and(eq(superAdmins.ssoUserId, ssoUserId), eq(superAdmins.status, 'active')))
    .limit(1);

  return admin || null;
}
