import { eq, and, desc, asc, count, gte, lte, inArray, sql } from 'drizzle-orm';
import { db } from '../db';
import {
  surveys,
  surveyScenes,
  surveyPhotos,
  surveyAiResults,
  scheduleInstances,
  tours,
  scenes,
  shelves,
  stores,
  users,
} from '../db/schema';
import { generatePresignedUploadUrl } from '../utils/s3';
import type { AccessMap } from './accessMap.service';
import type {
  StartSurveyInput,
  SubmitSurveyInput,
  SubmitSceneInput,
  SubmitPhotoInput,
  ListSurveysQuery,
  MySlotsQuery,
  UploadUrlInput,
} from '../validations/survey.validation';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scopeFilter(orgId: string, accessMap: AccessMap) {
  const conditions: any[] = [eq(surveys.orgId, orgId)];
  if (accessMap.scopeType === 'stores' && accessMap.dataScope?.storeIds?.length) {
    conditions.push(inArray(surveys.storeId, accessMap.dataScope.storeIds));
  }
  return and(...conditions);
}

// ─── Start survey ─────────────────────────────────────────────────────────────

export async function startSurvey(orgId: string, surveyorId: string, input: StartSurveyInput) {
  // Load the slot
  const [slot] = await db
    .select()
    .from(scheduleInstances)
    .where(
      and(
        eq(scheduleInstances.orgId, orgId),
        eq(scheduleInstances.id, input.scheduleInstanceId),
      ),
    )
    .limit(1);

  if (!slot) throw Object.assign(new Error('Schedule slot not found'), { statusCode: 404 });

  if (slot.status === 'completed') {
    throw Object.assign(new Error('This slot has already been completed'), { statusCode: 409 });
  }
  if (slot.status === 'cancelled' || slot.status === 'skipped') {
    throw Object.assign(new Error(`Slot is ${slot.status}`), { statusCode: 409 });
  }

  // Time window enforcement — cannot start before window opens
  const now = new Date();
  if (now < slot.windowStartUtc) {
    throw Object.assign(
      new Error(
        `Survey window has not opened yet. Window opens at ${slot.windowStartUtc.toISOString()}`,
      ),
      { statusCode: 403 },
    );
  }

  // Get active tour for store
  const [activeTour] = await db
    .select({ id: tours.id })
    .from(tours)
    .where(and(eq(tours.storeId, slot.storeId), eq(tours.status, 'active')))
    .orderBy(desc(tours.createdAt))
    .limit(1);

  // If survey already started for this slot, return the existing one
  if (slot.surveyId) {
    const [existing] = await db
      .select()
      .from(surveys)
      .where(eq(surveys.id, slot.surveyId))
      .limit(1);
    if (existing) return existing;
  }

  // Create survey record
  const [survey] = await db
    .insert(surveys)
    .values({
      orgId,
      storeId: slot.storeId,
      scheduleInstanceId: slot.id,
      tourId: activeTour?.id ?? null,
      surveyorId,
      status: 'in_progress',
      startedAt: now,
      metadata: {
        appVersion: input.appVersion ?? null,
        deviceInfo: input.deviceInfo ?? null,
      },
    })
    .returning();

  // Move slot to in_progress and link survey
  await db
    .update(scheduleInstances)
    .set({ status: 'in_progress', startedAt: now, surveyId: survey.id, updatedAt: new Date() })
    .where(eq(scheduleInstances.id, slot.id));

  return survey;
}

// ─── Submit a scene ───────────────────────────────────────────────────────────

export async function submitScene(orgId: string, surveyId: string, input: SubmitSceneInput) {
  const [survey] = await db
    .select({ id: surveys.id, orgId: surveys.orgId, tourId: surveys.tourId })
    .from(surveys)
    .where(and(eq(surveys.orgId, orgId), eq(surveys.id, surveyId)))
    .limit(1);

  if (!survey) throw Object.assign(new Error('Survey not found'), { statusCode: 404 });

  // Try to match with baseline scene by externalSceneId
  let baselineSceneId: string | null = null;
  if (survey.tourId) {
    const [baseline] = await db
      .select({ id: scenes.id })
      .from(scenes)
      .where(
        and(
          eq(scenes.tourId, survey.tourId),
          eq(scenes.externalSceneId, input.sceneId),
        ),
      )
      .limit(1);
    baselineSceneId = baseline?.id ?? null;
  }

  const [scene] = await db
    .insert(surveyScenes)
    .values({
      orgId,
      surveyId,
      externalSceneId: input.sceneId,
      baselineSceneId,
      panoramaUrl: input.panoramaUrl,
      thumbnailUrl: input.thumbnailUrl ?? null,
      captureStartHeading: input.heading?.toString() ?? null,
      displayOrder: input.displayOrder,
    })
    .returning();

  // Increment scene count on survey
  await db
    .update(surveys)
    .set({
      sceneCount: db.$count(surveyScenes, eq(surveyScenes.surveyId, surveyId)) as any,
      updatedAt: new Date(),
    })
    .where(eq(surveys.id, surveyId));

  return scene;
}

// ─── Submit a photo ───────────────────────────────────────────────────────────

export async function submitPhoto(orgId: string, surveyId: string, input: SubmitPhotoInput) {
  const [survey] = await db
    .select({ id: surveys.id, tourId: surveys.tourId, storeId: surveys.storeId })
    .from(surveys)
    .where(and(eq(surveys.orgId, orgId), eq(surveys.id, surveyId)))
    .limit(1);

  if (!survey) throw Object.assign(new Error('Survey not found'), { statusCode: 404 });

  // Resolve survey scene id
  let surveySceneId: string | null = null;
  if (input.sceneId) {
    const [ss] = await db
      .select({ id: surveyScenes.id })
      .from(surveyScenes)
      .where(
        and(
          eq(surveyScenes.surveyId, surveyId),
          eq(surveyScenes.externalSceneId, input.sceneId),
        ),
      )
      .limit(1);
    surveySceneId = ss?.id ?? null;
  }

  // Resolve shelf id from baseline tour
  let shelfId: string | null = null;
  if (input.shelfExternalId && survey.tourId) {
    // shelves don't have externalShelfId — match by displayOrder or label if available
    // For now we store shelfId as null; capture app can send shelf DB id directly if known
  }

  const [photo] = await db
    .insert(surveyPhotos)
    .values({
      surveyId,
      surveySceneId,
      shelfId,
      photoUrl: input.photoUrl,
      thumbnailUrl: input.thumbnailUrl ?? null,
      photoType: input.photoType,
      aiStatus: 'pending',
      metadata: input.metadata ?? null,
    })
    .returning();

  return photo;
}

// ─── Submit full survey (atomic) ──────────────────────────────────────────────

export async function submitSurvey(orgId: string, surveyId: string, input: SubmitSurveyInput) {
  const [survey] = await db
    .select()
    .from(surveys)
    .where(and(eq(surveys.orgId, orgId), eq(surveys.id, surveyId)))
    .limit(1);

  if (!survey) throw Object.assign(new Error('Survey not found'), { statusCode: 404 });
  if (survey.status === 'completed') {
    throw Object.assign(new Error('Survey already submitted'), { statusCode: 409 });
  }

  const completedAt = input.completedAt ? new Date(input.completedAt) : new Date();
  const durationSeconds = Math.round(
    (completedAt.getTime() - new Date(survey.startedAt).getTime()) / 1000,
  );

  // Build scene map
  const sceneIdMap: Record<string, string> = {};

  // Insert scenes
  if (input.scenes.length > 0) {
    // Resolve baseline scenes
    const baselineScenes =
      survey.tourId
        ? await db
            .select({ id: scenes.id, externalSceneId: scenes.externalSceneId })
            .from(scenes)
            .where(eq(scenes.tourId, survey.tourId))
        : [];

    const baselineMap: Record<string, string> = {};
    for (const b of baselineScenes) baselineMap[b.externalSceneId] = b.id;

    const sceneRows = await db
      .insert(surveyScenes)
      .values(
        input.scenes.map((s) => ({
          orgId,
          surveyId,
          externalSceneId: s.sceneId,
          baselineSceneId: baselineMap[s.sceneId] ?? null,
          panoramaUrl: s.panoramaUrl,
          thumbnailUrl: s.thumbnailUrl ?? null,
          captureStartHeading: s.heading?.toString() ?? null,
          displayOrder: s.displayOrder,
        })),
      )
      .returning({ id: surveyScenes.id, externalSceneId: surveyScenes.externalSceneId });

    for (const row of sceneRows) sceneIdMap[row.externalSceneId] = row.id;
  }

  // Insert photos
  let photoCount = 0;
  if (input.photos.length > 0) {
    const photoValues = input.photos.map((p) => ({
      surveyId,
      surveySceneId: p.sceneId ? (sceneIdMap[p.sceneId] ?? null) : null,
      shelfId: null as string | null,
      photoUrl: p.photoUrl,
      thumbnailUrl: p.thumbnailUrl ?? null,
      photoType: p.photoType,
      aiStatus: 'pending' as const,
      metadata: p.metadata ?? null,
    }));
    await db.insert(surveyPhotos).values(photoValues);
    photoCount = photoValues.length;
  }

  // Mark survey completed
  const [updated] = await db
    .update(surveys)
    .set({
      status: 'completed',
      completedAt,
      durationSeconds,
      sceneCount: input.scenes.length,
      shelfCount: photoCount,
      updatedAt: new Date(),
    })
    .where(eq(surveys.id, surveyId))
    .returning();

  // Mark slot completed
  if (survey.scheduleInstanceId) {
    await db
      .update(scheduleInstances)
      .set({
        status: 'completed',
        completedAt,
        updatedAt: new Date(),
      })
      .where(eq(scheduleInstances.id, survey.scheduleInstanceId));
  }

  return updated;
}

// ─── Generate real S3 presigned upload URL ────────────────────────────────────

export async function generateUploadUrl(surveyId: string, input: UploadUrlInput) {
  const key = `surveys/${surveyId}/${input.uploadType}/${Date.now()}-${input.filename}`;
  return generatePresignedUploadUrl(key, input.contentType);
}

// ─── List surveys ─────────────────────────────────────────────────────────────

export async function listSurveys(orgId: string, query: ListSurveysQuery, accessMap: AccessMap) {
  const { storeId, status, dateFrom, dateTo, page, perPage, sortOrder } = query;
  const offset = (page - 1) * perPage;

  const conditions: any[] = [eq(surveys.orgId, orgId)];

  // Data scope
  if (accessMap.scopeType === 'stores' && accessMap.dataScope?.storeIds?.length) {
    conditions.push(inArray(surveys.storeId, accessMap.dataScope.storeIds));
  }

  if (storeId) conditions.push(eq(surveys.storeId, storeId));
  if (status) conditions.push(eq(surveys.status, status));
  if (dateFrom) conditions.push(gte(surveys.startedAt, new Date(dateFrom)));
  if (dateTo) {
    const end = new Date(dateTo);
    end.setDate(end.getDate() + 1);
    conditions.push(lte(surveys.startedAt, end));
  }

  const where = and(...conditions);
  const orderFn = sortOrder === 'asc' ? asc : desc;

  const [data, [{ total }]] = await Promise.all([
    db
      .select({
        id: surveys.id,
        storeId: surveys.storeId,
        storeName: stores.name,
        surveyorId: surveys.surveyorId,
        surveyorName: users.name,
        status: surveys.status,
        startedAt: surveys.startedAt,
        completedAt: surveys.completedAt,
        durationSeconds: surveys.durationSeconds,
        sceneCount: surveys.sceneCount,
        shelfCount: surveys.shelfCount,
        scheduleInstanceId: surveys.scheduleInstanceId,
        createdAt: surveys.createdAt,
      })
      .from(surveys)
      .leftJoin(stores, eq(surveys.storeId, stores.id))
      .leftJoin(users, eq(surveys.surveyorId, users.id))
      .where(where)
      .orderBy(orderFn(surveys.startedAt))
      .limit(perPage)
      .offset(offset),
    db.select({ total: count() }).from(surveys).where(where),
  ]);

  return { data, total: Number(total), page, perPage, totalPages: Math.ceil(Number(total) / perPage) };
}

// ─── Get survey by ID ─────────────────────────────────────────────────────────

export async function getSurveyById(orgId: string, surveyId: string, accessMap: AccessMap) {
  const conditions: any[] = [eq(surveys.orgId, orgId), eq(surveys.id, surveyId)];
  if (accessMap.scopeType === 'stores' && accessMap.dataScope?.storeIds?.length) {
    conditions.push(inArray(surveys.storeId, accessMap.dataScope.storeIds));
  }

  const [survey] = await db
    .select()
    .from(surveys)
    .where(and(...conditions))
    .limit(1);

  if (!survey) return null;

  const scenesData = await db
    .select()
    .from(surveyScenes)
    .where(eq(surveyScenes.surveyId, surveyId))
    .orderBy(surveyScenes.displayOrder);

  const photosData = await db
    .select()
    .from(surveyPhotos)
    .where(eq(surveyPhotos.surveyId, surveyId));

  // Surveyor + store names
  const [surveyorRow] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, survey.surveyorId))
    .limit(1);

  const [storeRow] = await db
    .select({ name: stores.name })
    .from(stores)
    .where(eq(stores.id, survey.storeId))
    .limit(1);

  return {
    ...survey,
    surveyorName: surveyorRow?.name ?? null,
    surveyorEmail: surveyorRow?.email ?? null,
    storeName: storeRow?.name ?? null,
    scenes: scenesData.map((s) => ({
      ...s,
      photos: photosData.filter((p) => p.surveySceneId === s.id),
    })),
    photos: photosData.filter((p) => !p.surveySceneId),
  };
}

// ─── My slots (surveyor-facing) ───────────────────────────────────────────────

export async function getMySlots(surveyorId: string, orgId: string, query: MySlotsQuery) {
  const { dateFrom, dateTo, status, page, perPage } = query;
  const offset = (page - 1) * perPage;

  const conditions: any[] = [
    eq(scheduleInstances.orgId, orgId),
    eq(scheduleInstances.assignedSurveyorId, surveyorId),
  ];

  if (status) conditions.push(eq(scheduleInstances.status, status));
  if (dateFrom) conditions.push(gte(scheduleInstances.scheduledDate, dateFrom));
  if (dateTo) conditions.push(lte(scheduleInstances.scheduledDate, dateTo));

  const where = and(...conditions);

  const [data, [{ total }]] = await Promise.all([
    db
      .select({
        id: scheduleInstances.id,
        storeId: scheduleInstances.storeId,
        storeName: stores.name,
        scheduledDate: scheduleInstances.scheduledDate,
        windowStartUtc: scheduleInstances.windowStartUtc,
        windowEndUtc: scheduleInstances.windowEndUtc,
        windowStartLocal: scheduleInstances.windowStartLocal,
        windowEndLocal: scheduleInstances.windowEndLocal,
        timezone: scheduleInstances.timezone,
        status: scheduleInstances.status,
        surveyId: scheduleInstances.surveyId,
      })
      .from(scheduleInstances)
      .leftJoin(stores, eq(scheduleInstances.storeId, stores.id))
      .where(where)
      .orderBy(asc(scheduleInstances.windowStartUtc))
      .limit(perPage)
      .offset(offset),
    db.select({ total: count() }).from(scheduleInstances).where(where),
  ]);

  return { data, total: Number(total), page, perPage, totalPages: Math.ceil(Number(total) / perPage) };
}
// ─── Mock AI processing ───────────────────────────────────────────────────────
// Simulates the external AI product-recognition service calling back with results.
// In production this would be replaced by the real AI team's webhook hitting our endpoint.

const MOCK_BRANDS = ['Haldiram', 'PepsiCo', 'Coca-Cola', 'Nestlé', 'ITC', 'Britannia', 'Parle'];
const MOCK_PRODUCTS: Record<string, string[]> = {
  Haldiram: ["Aloo Bhujia", "Mixture", "Sev", "Methi Sev", "Moong Dal"],
  PepsiCo: ["Lay's Classic", "Kurkure Masala", "Doritos Nacho", "Uncle Chipps"],
  'Coca-Cola': ["Coke 500ml", "Sprite 750ml", "Limca 250ml", "Thums Up 1L"],
  Nestlé: ["KitKat 4F", "Munch", "Milkmaid 400g", "Maggi 2-Min"],
  ITC: ["Bingo Mad Angles", "Bingo Original Style", "Sunfeast Dark Fantasy"],
  Britannia: ["Good Day Cashew", "NutriChoice", "50-50 Maska Chaska"],
  Parle: ["Parle-G Original", "Krackjack", "Hide & Seek Choco"],
};

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateMockProducts(count: number) {
  const results = [];
  for (let i = 0; i < count; i++) {
    const brand = MOCK_BRANDS[Math.floor(Math.random() * MOCK_BRANDS.length)];
    const productList = MOCK_PRODUCTS[brand];
    const name = productList[Math.floor(Math.random() * productList.length)];
    results.push({
      name,
      brand,
      sku: `SKU-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      confidence: parseFloat((0.7 + Math.random() * 0.29).toFixed(3)),
      position: {
        shelf_row: randomBetween(1, 5),
        shelf_col: randomBetween(1, 8),
        bbox: { x: randomBetween(10, 400), y: randomBetween(10, 300), width: randomBetween(40, 120), height: randomBetween(40, 120) },
      },
    });
  }
  return results;
}

export async function mockProcessAI(orgId: string, surveyId: string) {
  // Verify survey belongs to org
  const [survey] = await db
    .select({ id: surveys.id, storeId: surveys.storeId })
    .from(surveys)
    .where(and(eq(surveys.orgId, orgId), eq(surveys.id, surveyId)))
    .limit(1);

  if (!survey) throw Object.assign(new Error('Survey not found'), { statusCode: 404 });

  // Load all photos
  const photos = await db
    .select({ id: surveyPhotos.id, photoType: surveyPhotos.photoType })
    .from(surveyPhotos)
    .where(eq(surveyPhotos.surveyId, surveyId));

  if (photos.length === 0) {
    return { processed: 0, message: 'No photos to process' };
  }

  const now = new Date();
  const processingTimeMs = randomBetween(800, 3200);

  const resultRows = photos.map((photo) => {
    const productCount = photo.photoType === 'panorama_crop' ? 0 : randomBetween(3, 12);
    return {
      surveyPhotoId: photo.id,
      surveyId,
      storeId: survey.storeId,
      status: 'completed' as const,
      products: generateMockProducts(productCount),
      productCount,
      processingTimeMs,
      processedAt: now,
    };
  });

  // Upsert: conflict on surveyPhotoId → update existing result
  await db
    .insert(surveyAiResults)
    .values(resultRows)
    .onConflictDoUpdate({
      target: surveyAiResults.surveyPhotoId,
      set: {
        status: sql`excluded.status`,
        products: sql`excluded.products`,
        productCount: sql`excluded.product_count`,
        processingTimeMs: sql`excluded.processing_time_ms`,
        processedAt: sql`excluded.processed_at`,
        updatedAt: now,
      },
    });

  // Mark all photos as AI-processed
  await db
    .update(surveyPhotos)
    .set({ aiStatus: 'completed', updatedAt: now })
    .where(eq(surveyPhotos.surveyId, surveyId));

  return { processed: photos.length, surveyId };
}