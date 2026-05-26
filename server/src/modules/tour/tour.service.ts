import { eq, and, desc, count } from 'drizzle-orm';
import { db } from '../../shared/db';
import { tours, scenes, shelves, stores } from '../../shared/db/schema';
import type { TourSyncInput, ListToursQuery } from './tour.types';
import type { AccessMap } from '../../shared/services/accessMap.service';

// ─── Sync a new tour from the capture app ────────────────────────────────────

export async function syncTour(orgId: string, input: TourSyncInput, capturedBy: string | null) {
  // Verify store belongs to org
  const [store] = await db
    .select({ id: stores.id, status: stores.status })
    .from(stores)
    .where(and(eq(stores.orgId, orgId), eq(stores.id, input.storeId)))
    .limit(1);

  if (!store) throw Object.assign(new Error('Store not found'), { statusCode: 404 });

  // Archive any existing active tour for this store
  await db
    .update(tours)
    .set({ status: 'archived', updatedAt: new Date() })
    .where(and(eq(tours.storeId, input.storeId), eq(tours.status, 'active')));

  // Determine version number
  const [{ total }] = await db
    .select({ total: count() })
    .from(tours)
    .where(eq(tours.storeId, input.storeId));

  const version = Number(total) + 1;
  const isBaseline = version === 1;

  // Build manifest for storage
  const tourManifest = {
    capturedAt: input.capturedAt,
    appVersion: input.appVersion ?? null,
    scenes: input.scenes,
    shelves: input.shelves,
  };

  // Insert tour
  const [tour] = await db
    .insert(tours)
    .values({
      orgId,
      storeId: input.storeId,
      version,
      status: 'active',
      capturedBy: capturedBy ?? null,
      tourManifest,
      sceneCount: input.scenes.length,
      shelfCount: input.shelves.length,
      isBaseline,
    })
    .returning();

  // Map sceneId → DB scene id for shelf foreign keys
  const sceneIdMap: Record<string, string> = {};

  // Insert scenes
  if (input.scenes.length > 0) {
    const sceneRows = await db
      .insert(scenes)
      .values(
        input.scenes.map((s) => ({
          orgId,
          tourId: tour.id,
          externalSceneId: s.sceneId,
          panoramaUrl: s.panoramaUrl,
          thumbnailUrl: s.thumbnailUrl ?? null,
          captureStartHeading: s.heading?.toString() ?? null,
          latitude: s.latitude?.toString() ?? null,
          longitude: s.longitude?.toString() ?? null,
          label: s.label ?? null,
          displayOrder: s.displayOrder,
          floor: s.floor,
        })),
      )
      .returning({ id: scenes.id, externalSceneId: scenes.externalSceneId });

    for (const row of sceneRows) {
      sceneIdMap[row.externalSceneId] = row.id;
    }
  }

  // Insert shelves
  if (input.shelves.length > 0) {
    const shelfValues = input.shelves
      .filter((sh) => sceneIdMap[sh.sceneId]) // skip shelves whose scene wasn't found
      .map((sh) => ({
        orgId,
        tourId: tour.id,
        sceneId: sceneIdMap[sh.sceneId],
        label: sh.label,
        yaw: sh.yaw.toString(),
        pitch: sh.pitch.toString(),
        boundingBox: sh.boundingBox ?? null,
        shelfImageUrl: sh.shelfImageUrl ?? null,
        displayOrder: sh.displayOrder,
      }));

    if (shelfValues.length > 0) {
      await db.insert(shelves).values(shelfValues);
    }
  }

  // Activate store if it was pending_tour
  if (store.status === 'pending_tour') {
    await db
      .update(stores)
      .set({ status: 'active', updatedAt: new Date() })
      .where(eq(stores.id, input.storeId));
  }

  return {
    tourId: tour.id,
    version: tour.version,
    isBaseline,
    storeStatus: store.status === 'pending_tour' ? 'active' : store.status,
    sceneCount: tour.sceneCount,
    shelfCount: tour.shelfCount,
  };
}

// ─── Get active tour for a store ─────────────────────────────────────────────

export async function getActiveTour(orgId: string, storeId: string) {
  const [tour] = await db
    .select()
    .from(tours)
    .where(and(eq(tours.orgId, orgId), eq(tours.storeId, storeId), eq(tours.status, 'active')))
    .orderBy(desc(tours.createdAt))
    .limit(1);

  if (!tour) return null;

  const sceneRows = await db
    .select()
    .from(scenes)
    .where(eq(scenes.tourId, tour.id))
    .orderBy(scenes.displayOrder);

  const shelfRows = await db
    .select()
    .from(shelves)
    .where(eq(shelves.tourId, tour.id))
    .orderBy(shelves.displayOrder);

  return {
    ...tour,
    scenes: sceneRows.map((s) => ({
      ...s,
      shelves: shelfRows.filter((sh) => sh.sceneId === s.id),
    })),
  };
}

// ─── Get tour by ID ───────────────────────────────────────────────────────────

export async function getTourById(orgId: string, tourId: string) {
  const [tour] = await db
    .select()
    .from(tours)
    .where(and(eq(tours.orgId, orgId), eq(tours.id, tourId)))
    .limit(1);

  if (!tour) return null;

  const sceneRows = await db
    .select()
    .from(scenes)
    .where(eq(scenes.tourId, tourId))
    .orderBy(scenes.displayOrder);

  const shelfRows = await db
    .select()
    .from(shelves)
    .where(eq(shelves.tourId, tourId))
    .orderBy(shelves.displayOrder);

  return {
    ...tour,
    scenes: sceneRows.map((s) => ({
      ...s,
      shelves: shelfRows.filter((sh) => sh.sceneId === s.id),
    })),
  };
}

// ─── List tours for a store (history) ────────────────────────────────────────

export async function listTours(orgId: string, query: ListToursQuery, accessMap: AccessMap) {
  const { storeId, status, page, perPage } = query;
  const offset = (page - 1) * perPage;

  const conditions = [eq(tours.orgId, orgId)];
  if (storeId) conditions.push(eq(tours.storeId, storeId));
  if (status) conditions.push(eq(tours.status, status));

  // Data scope
  if (accessMap.scopeType === 'stores' && accessMap.dataScope?.storeIds?.length) {
    if (storeId && !accessMap.dataScope.storeIds.includes(storeId)) {
      return { data: [], total: 0, page, perPage, totalPages: 0 };
    }
  }

  const where = conditions.length === 1 ? conditions[0] : and(...conditions);

  const [data, [{ total }]] = await Promise.all([
    db
      .select({
        id: tours.id,
        storeId: tours.storeId,
        version: tours.version,
        status: tours.status,
        isBaseline: tours.isBaseline,
        sceneCount: tours.sceneCount,
        shelfCount: tours.shelfCount,
        capturedBy: tours.capturedBy,
        createdAt: tours.createdAt,
      })
      .from(tours)
      .where(where)
      .orderBy(desc(tours.createdAt))
      .limit(perPage)
      .offset(offset),
    db.select({ total: count() }).from(tours).where(where),
  ]);

  return { data, total: Number(total), page, perPage, totalPages: Math.ceil(Number(total) / perPage) };
}
