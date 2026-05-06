import { eq, and, or, ilike, desc, asc, count, isNull, sql } from 'drizzle-orm';
import { db } from '../db';
import { zones, stores } from '../db/schema';
import type { CreateZoneInput, UpdateZoneInput, ListZonesQuery } from '../validations/zone.validation';

// Create a zone
export async function createZone(orgId: string, input: CreateZoneInput) {
  // If parentZoneId provided, verify it belongs to the same org
  if (input.parentZoneId) {
    const [parent] = await db
      .select({ id: zones.id })
      .from(zones)
      .where(and(eq(zones.orgId, orgId), eq(zones.id, input.parentZoneId)))
      .limit(1);
    if (!parent) {
      throw new Error('Parent zone not found');
    }
  }

  const [zone] = await db
    .insert(zones)
    .values({
      orgId,
      name: input.name,
      description: input.description || null,
      parentZoneId: input.parentZoneId || null,
    })
    .returning();

  return zone;
}

// List zones with search, filters, pagination
export async function listZones(orgId: string, query: ListZonesQuery) {
  const { page, perPage, search, parentZoneId, sortBy, sortOrder } = query;
  const offset = (page - 1) * perPage;

  const conditions = [eq(zones.orgId, orgId)];

  // Filter by parent zone (null = top-level only)
  if (parentZoneId === undefined) {
    // No filter — return all zones
  } else {
    conditions.push(eq(zones.parentZoneId, parentZoneId));
  }

  if (search) {
    conditions.push(
      or(ilike(zones.name, `%${search}%`), ilike(zones.description, `%${search}%`))!,
    );
  }

  const where = and(...conditions);

  const orderByMap: Record<string, any> = {
    name: zones.name,
    createdAt: zones.createdAt,
  };
  const orderCol = orderByMap[sortBy] || zones.name;
  const orderFn = sortOrder === 'asc' ? asc : desc;

  const [data, [{ total }]] = await Promise.all([
    db
      .select({
        id: zones.id,
        orgId: zones.orgId,
        parentZoneId: zones.parentZoneId,
        name: zones.name,
        description: zones.description,
        createdAt: zones.createdAt,
        updatedAt: zones.updatedAt,
      })
      .from(zones)
      .where(where)
      .orderBy(orderFn(orderCol))
      .limit(perPage)
      .offset(offset),
    db.select({ total: count() }).from(zones).where(where),
  ]);

  return {
    data,
    total: Number(total),
    page,
    perPage,
    totalPages: Math.ceil(Number(total) / perPage),
  };
}

// Get single zone by ID
export async function getZoneById(orgId: string, zoneId: string) {
  const [zone] = await db
    .select()
    .from(zones)
    .where(and(eq(zones.orgId, orgId), eq(zones.id, zoneId)))
    .limit(1);

  return zone || null;
}

// Update zone
export async function updateZone(orgId: string, zoneId: string, data: UpdateZoneInput) {
  // Prevent setting parent to self
  if (data.parentZoneId === zoneId) {
    throw new Error('A zone cannot be its own parent');
  }

  // If parentZoneId provided, verify it belongs to the same org
  if (data.parentZoneId) {
    const [parent] = await db
      .select({ id: zones.id })
      .from(zones)
      .where(and(eq(zones.orgId, orgId), eq(zones.id, data.parentZoneId)))
      .limit(1);
    if (!parent) {
      throw new Error('Parent zone not found');
    }
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.parentZoneId !== undefined) updateData.parentZoneId = data.parentZoneId;

  const [updated] = await db
    .update(zones)
    .set(updateData)
    .where(and(eq(zones.orgId, orgId), eq(zones.id, zoneId)))
    .returning();

  return updated || null;
}

// Delete zone (hard delete — zones don't have status field)
export async function deleteZone(orgId: string, zoneId: string) {
  // Check if zone has child zones
  const [childZone] = await db
    .select({ id: zones.id })
    .from(zones)
    .where(and(eq(zones.orgId, orgId), eq(zones.parentZoneId, zoneId)))
    .limit(1);
  if (childZone) {
    throw new Error('Cannot delete a zone that has sub-zones. Remove sub-zones first.');
  }

  // Check if zone has stores assigned
  const [assignedStore] = await db
    .select({ id: stores.id })
    .from(stores)
    .where(and(eq(stores.orgId, orgId), eq(stores.zoneId, zoneId)))
    .limit(1);
  if (assignedStore) {
    throw new Error('Cannot delete a zone that has stores assigned. Reassign stores first.');
  }

  const [deleted] = await db
    .delete(zones)
    .where(and(eq(zones.orgId, orgId), eq(zones.id, zoneId)))
    .returning();

  return deleted || null;
}

// Get all zones for an org (flat list, no pagination — for dropdowns)
export async function getAllZones(orgId: string) {
  return db
    .select({
      id: zones.id,
      name: zones.name,
      parentZoneId: zones.parentZoneId,
      description: zones.description,
    })
    .from(zones)
    .where(eq(zones.orgId, orgId))
    .orderBy(asc(zones.name));
}
