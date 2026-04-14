import { eq, and, or, ilike, sql, desc, asc, count } from 'drizzle-orm';
import { db } from '../db';
import { stores, users, storeCategories, zones } from '../db/schema';
import type { AccessMap } from './accessMap.service';
import type { CreateStoreInput, UpdateStoreInput, ListStoresQuery } from '../validations/store.validation';

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
export async function listStores(
  orgId: string,
  accessMap: AccessMap,
  query: ListStoresQuery,
) {
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
    db
      .select({ total: count() })
      .from(stores)
      .where(where),
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
