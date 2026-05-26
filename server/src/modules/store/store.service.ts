import { eq, and, or, ilike, sql, desc, asc, count, isNull, inArray } from 'drizzle-orm';
import { db } from '../../shared/db';
import {
  stores,
  users,
  storeCategories,
  zones,
  organizations,
  roleTemplates,
  roleTemplatePermissions,
  userPermissions,
  userDataScopes,
} from '../../shared/db/schema';
import type { AccessMap } from '../../shared/services/accessMap.service';
import type {
  CreateStoreInput,
  UpdateStoreInput,
  ListStoresQuery,
  CsvRow,
} from './store.types';
import { sendEmployeeInviteEmail } from '../../shared/services/email.service';

// Slug generation (reused pattern from org service)
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

async function uniqueSlug(orgId: string, base: string): Promise<string> {
  let slug = base;
  let attempt = 0;
  while (true) {
    const [existing] = await db
      .select({ id: stores.id })
      .from(stores)
      .where(and(eq(stores.orgId, orgId), eq(stores.slug, slug)))
      .limit(1);
    if (!existing) return slug;
    attempt++;
    slug = `${base}-${attempt}`;
  }
}

// Data scope filter — restricts which stores a user can see based on their access map
// org scope → all stores in the org
// zones scope → stores in the user's assigned zones
// stores scope → only specifically assigned stores
function scopeFilter(orgId: string, accessMap: AccessMap) {
  const conditions = [eq(stores.orgId, orgId)];

  if (accessMap.scopeType === 'zones' && accessMap.dataScope.zoneIds?.length) {
    // Zone managers see stores in their zones
    const zoneIds = accessMap.dataScope.zoneIds;
    conditions.push(
      sql`${stores.zoneId} IN (${sql.join(
        zoneIds.map((id) => sql`${id}::uuid`),
        sql`, `,
      )})`,
    );
  } else if (accessMap.scopeType === 'stores' && accessMap.dataScope.storeIds?.length) {
    // Store managers see only their assigned stores
    const storeIds = accessMap.dataScope.storeIds;
    conditions.push(
      sql`${stores.id} IN (${sql.join(
        storeIds.map((id) => sql`${id}::uuid`),
        sql`, `,
      )})`,
    );
  }
  // org scope → no additional filter, just org_id

  return and(...conditions);
}

// Create a store
export async function createStore(orgId: string, input: CreateStoreInput) {
  const slug = await uniqueSlug(orgId, generateSlug(input.name));

  const [store] = await db
    .insert(stores)
    .values({
      orgId,
      name: input.name,
      slug,
      status: 'pending_tour',
      categoryId: input.categoryId || null,
      address: input.address,
      location: input.location || null,
      timezone: input.timezone || null,
      contactPhone: input.contactPhone || null,
      contactEmail: input.contactEmail || null,
      operatingHours: input.operatingHours || null,
    })
    .returning();

  return store;
}

// List stores with search, filters, pagination, and data scope
export async function listStores(orgId: string, accessMap: AccessMap, query: ListStoresQuery) {
  const { page, perPage, search, status, sortBy, sortOrder } = query;
  const offset = (page - 1) * perPage;

  // Build WHERE conditions
  const baseScope = scopeFilter(orgId, accessMap);
  const conditions = [baseScope];

  if (status) {
    conditions.push(eq(stores.status, status));
  }

  if (search) {
    conditions.push(
      or(
        ilike(stores.name, `%${search}%`),
        sql`${stores.address}->>'city' ILIKE ${`%${search}%`}`,
      )!,
    );
  }

  const where = and(...conditions);

  // Sort
  const orderByMap: Record<string, any> = {
    name: stores.name,
    createdAt: stores.createdAt,
    status: stores.status,
  };
  const orderCol = orderByMap[sortBy] || stores.createdAt;
  const orderFn = sortOrder === 'asc' ? asc : desc;

  // Query data + total count
  const [data, [{ total }]] = await Promise.all([
    db
      .select({
        id: stores.id,
        name: stores.name,
        slug: stores.slug,
        status: stores.status,
        address: stores.address,
        location: stores.location,
        timezone: stores.timezone,
        contactPhone: stores.contactPhone,
        contactEmail: stores.contactEmail,
        categoryId: stores.categoryId,
        managerId: stores.managerId,
        createdAt: stores.createdAt,
      })
      .from(stores)
      .where(where)
      .orderBy(orderFn(orderCol))
      .limit(perPage)
      .offset(offset),
    db.select({ total: count() }).from(stores).where(where),
  ]);

  return {
    data,
    total: Number(total),
    page,
    perPage,
    totalPages: Math.ceil(Number(total) / perPage),
  };
}

// Get single store by ID (with scope check)
export async function getStoreById(orgId: string, storeId: string, accessMap: AccessMap) {
  const where = and(scopeFilter(orgId, accessMap), eq(stores.id, storeId));

  const [store] = await db.select().from(stores).where(where).limit(1);

  return store || null;
}

// Update store
export async function updateStore(orgId: string, storeId: string, data: UpdateStoreInput) {
  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (data.name !== undefined) updateData.name = data.name;
  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.location !== undefined) updateData.location = data.location;
  if (data.timezone !== undefined) updateData.timezone = data.timezone;
  if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone || null;
  if (data.contactEmail !== undefined) updateData.contactEmail = data.contactEmail || null;
  if (data.operatingHours !== undefined) updateData.operatingHours = data.operatingHours;

  const [updated] = await db
    .update(stores)
    .set(updateData)
    .where(and(eq(stores.orgId, orgId), eq(stores.id, storeId)))
    .returning();

  return updated || null;
}

// Deactivate store (soft delete)
export async function deactivateStore(orgId: string, storeId: string) {
  const [updated] = await db
    .update(stores)
    .set({ status: 'inactive', updatedAt: new Date() })
    .where(and(eq(stores.orgId, orgId), eq(stores.id, storeId)))
    .returning();

  return updated || null;
}

export interface BulkImportResultRow {
  storeName: string;
  managerEmail: string;
  isNewManager: boolean;
}

export interface BulkImportFailure {
  row: number;
  storeName: string;
  reason: string;
}

export interface BulkImportResult {
  created: BulkImportResultRow[];
  failed: BulkImportFailure[];
}

// Splits an array into chunks of at most `size` elements.
// Used to stay within Postgres's 65535-parameter limit on batch inserts.
function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Bulk import stores from CSV rows.
//
// Strategy (4 DB round trips regardless of row count, plus one per chunk):
//   1. Pre-fetch: org name, zones, existing slugs, existing users, role template perms
//   2. Pass 1 (in-memory): classify rows — skip inactive managers, deduplicate new
//      manager emails, resolve zone IDs, generate slugs
//   3. Batch insert new users (chunked, ~1 000 rows/chunk)
//   4. Batch insert permissions for new users (chunked)
//   5. Batch insert stores (chunked)
//   6. Batch insert data scopes (chunked)
//   7. Fire-and-forget invite emails for new managers
//
//   Rows that fail pre-validation (inactive manager) are skipped and reported.
//   DB-level failures surface as a thrown error (the caller should handle it).
export async function bulkImportStores(
  orgId: string,
  callerId: string,
  validRows: { row: CsvRow; rowNum: number }[],
): Promise<BulkImportResult> {
  const CHUNK = 1_000; // safe upper bound to stay under Postgres's 65 535-param limit

  // ── Pre-fetch (5 queries, independent of import size) ─────────────────────

  const [
    [org],
    orgZones,
    existingSlugsRows,
    [storeManagerTemplate],
  ] = await Promise.all([
    db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, orgId)).limit(1),
    db.select({ id: zones.id, name: zones.name }).from(zones).where(eq(zones.orgId, orgId)),
    db.select({ slug: stores.slug }).from(stores).where(eq(stores.orgId, orgId)),
    db.select({ id: roleTemplates.id }).from(roleTemplates).where(and(eq(roleTemplates.name, 'store_manager'), isNull(roleTemplates.orgId))).limit(1),
  ]);

  const orgName = org?.name ?? 'your organization';
  const zonesByName = new Map(orgZones.map((z) => [z.name.toLowerCase().trim(), z.id]));
  const usedSlugs = new Set(existingSlugsRows.map((r) => r.slug));

  let storeManagerPerms: string[] = [];
  if (storeManagerTemplate) {
    const perms = await db
      .select({ permission: roleTemplatePermissions.permission })
      .from(roleTemplatePermissions)
      .where(eq(roleTemplatePermissions.roleTemplateId, storeManagerTemplate.id));
    storeManagerPerms = perms.map((p) => p.permission);
  }

  // Bulk-lookup existing users by the unique emails in this CSV.
  // Large imports may have thousands of unique emails; chunk inArray to be safe.
  const uniqueEmails = [...new Set(validRows.map((r) => r.row.manager_email))];
  const existingUsersRows: { id: string; email: string; status: string }[] = [];
  for (const chunk of chunkArray(uniqueEmails, 5_000)) {
    const rows = await db
      .select({ id: users.id, email: users.email, status: users.status })
      .from(users)
      .where(and(eq(users.orgId, orgId), inArray(users.email, chunk)));
    existingUsersRows.push(...rows);
  }
  // email → { id, status } — mutated as new users are created below
  const usersByEmail = new Map(existingUsersRows.map((u) => [u.email, { id: u.id, status: u.status }]));

  // In-memory slug reservation — no extra DB queries needed
  function reserveSlug(name: string): string {
    const base = generateSlug(name);
    let slug = base;
    let attempt = 0;
    while (usedSlugs.has(slug)) { attempt++; slug = `${base}-${attempt}`; }
    usedSlugs.add(slug);
    return slug;
  }

  // ── Pass 1: classify rows in-memory ───────────────────────────────────────

  const failed: BulkImportFailure[] = [];

  // Ordered list of rows that will actually be inserted, with pre-resolved metadata
  interface ReadyRow {
    rowNum: number;
    row: CsvRow;
    slug: string;
    zoneId: string | null;
    managerEmail: string;
    isNewManager: boolean;
  }
  const readyRows: ReadyRow[] = [];

  // Deduplicate new manager emails — first occurrence wins for the name field
  const newManagersByEmail = new Map<string, string>(); // email → name

  for (const { row, rowNum } of validRows) {
    const email = row.manager_email;
    const existing = usersByEmail.get(email);

    if (existing?.status === 'inactive') {
      failed.push({
        row: rowNum,
        storeName: row.store_name,
        reason: `Manager ${email} is inactive — reactivate the account before importing`,
      });
      continue;
    }

    const isNewManager = !existing && !newManagersByEmail.has(email);
    if (isNewManager) newManagersByEmail.set(email, row.manager_name);

    const zoneId = row.zone_name
      ? (zonesByName.get(row.zone_name.toLowerCase().trim()) ?? null)
      : null;

    readyRows.push({
      rowNum,
      row,
      slug: reserveSlug(row.store_name),
      zoneId,
      managerEmail: email,
      isNewManager: isNewManager || (!existing && newManagersByEmail.has(email)),
    });
  }

  if (readyRows.length === 0) return { created: [], failed };

  // ── Batch 1: insert new users ──────────────────────────────────────────────

  const newManagerEntries = [...newManagersByEmail.entries()]; // [email, name][]
  for (const chunk of chunkArray(newManagerEntries, CHUNK)) {
    const inserted = await db
      .insert(users)
      .values(
        chunk.map(([email, name]) => ({
          ssoUserId: null,
          orgId,
          email,
          name,
          roleTemplate: 'store_manager',
          scopeType: 'stores',
          status: 'pending_first_login',
          createdBy: callerId,
        })),
      )
      .returning({ id: users.id, email: users.email });
    for (const u of inserted) {
      usersByEmail.set(u.email, { id: u.id, status: 'pending_first_login' });
    }
  }

  // ── Batch 2: insert permissions for new users ──────────────────────────────

  if (storeManagerPerms.length > 0 && newManagerEntries.length > 0) {
    const permRows = newManagerEntries.flatMap(([email]) => {
      const uid = usersByEmail.get(email)?.id;
      return uid ? storeManagerPerms.map((p) => ({ userId: uid, permission: p })) : [];
    });
    for (const chunk of chunkArray(permRows, CHUNK)) {
      await db.insert(userPermissions).values(chunk);
    }
  }

  // ── Batch 3: insert stores ─────────────────────────────────────────────────

  // Build insert values maintaining the same order as readyRows so we can zip
  // with the returned IDs.
  const storeInsertValues = readyRows.map(({ row, slug, zoneId, managerEmail }) => ({
    orgId,
    zoneId: zoneId ?? null,
    name: row.store_name,
    slug,
    status: 'pending_tour',
    address: {
      city: row.city,
      state: row.state || undefined,
      postalCode: row.postal_code || undefined,
      country: row.country || undefined,
    },
    contactPhone: row.contact_phone || null,
    contactEmail: row.contact_email || null,
    managerId: usersByEmail.get(managerEmail)!.id,
  }));

  // Postgres guarantees INSERT … VALUES … RETURNING rows come back in input order
  const insertedStores: { id: string; name: string }[] = [];
  for (const chunk of chunkArray(storeInsertValues, CHUNK)) {
    const rows = await db
      .insert(stores)
      .values(chunk)
      .returning({ id: stores.id, name: stores.name });
    insertedStores.push(...rows);
  }

  // ── Batch 4: insert data scopes ────────────────────────────────────────────

  const dataScopeValues = insertedStores.map((s, i) => ({
    userId: usersByEmail.get(readyRows[i].managerEmail)!.id,
    scopeEntityId: s.id,
  }));
  for (const chunk of chunkArray(dataScopeValues, CHUNK)) {
    await db.insert(userDataScopes).values(chunk).onConflictDoNothing();
  }

  // ── Build result + fire invite emails ─────────────────────────────────────

  const created: BulkImportResultRow[] = insertedStores.map((s, i) => ({
    storeName: s.name,
    managerEmail: readyRows[i].managerEmail,
    isNewManager: readyRows[i].isNewManager,
  }));

  const ssoUrl = process.env.SSO_FRONTEND_URL ?? 'https://accounts.shelfexecution.com';
  for (const [email, name] of newManagerEntries) {
    sendEmployeeInviteEmail(email, name, orgName, 'Store Manager', ssoUrl);
  }

  return { created, failed };
}
