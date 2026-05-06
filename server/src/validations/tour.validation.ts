import { z } from 'zod';

// ─── Tour Sync (from capture app) ────────────────────────────────────────────

const shelfSchema = z.object({
  shelfId: z.string().min(1),          // capture app's internal ID
  sceneId: z.string().min(1),          // which scene this shelf lives in
  label: z.string().min(1).max(200),
  yaw: z.number().min(-360).max(360),
  pitch: z.number().min(-90).max(90),
  boundingBox: z
    .object({
      yawLeft: z.number(),
      yawRight: z.number(),
      pitchTop: z.number(),
      pitchBottom: z.number(),
    })
    .optional()
    .nullable(),
  shelfImageUrl: z.string().url().optional().nullable(),
  displayOrder: z.number().int().min(0).default(0),
});

const sceneSchema = z.object({
  sceneId: z.string().min(1),          // capture app's internal ID
  panoramaUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional().nullable(),
  label: z.string().max(200).optional().nullable(),
  displayOrder: z.number().int().min(0).default(0),
  floor: z.number().int().min(0).default(0),
  heading: z.number().min(0).max(360).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
});

export const tourSyncSchema = z.object({
  storeId: z.string().uuid('Invalid store ID'),
  capturedAt: z.string().datetime({ message: 'capturedAt must be ISO 8601' }),
  appVersion: z.string().optional(),
  scenes: z.array(sceneSchema).min(1, 'At least one scene is required'),
  shelves: z.array(shelfSchema).default([]),
});

export type TourSyncInput = z.infer<typeof tourSyncSchema>;

// ─── List tours ───────────────────────────────────────────────────────────────

export const listToursSchema = z.object({
  storeId: z.string().uuid().optional(),
  status: z.enum(['processing', 'active', 'archived']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(50).default(10),
});

export type ListToursQuery = z.infer<typeof listToursSchema>;
