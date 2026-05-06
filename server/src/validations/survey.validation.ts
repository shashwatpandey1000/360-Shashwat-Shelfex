import { z } from 'zod';

// ─── Start survey ─────────────────────────────────────────────────────────────

export const startSurveySchema = z.object({
  scheduleInstanceId: z.string().uuid('Invalid schedule instance ID'),
  appVersion: z.string().optional(),
  deviceInfo: z.record(z.string(), z.unknown()).optional(),
});

export type StartSurveyInput = z.infer<typeof startSurveySchema>;

// ─── Submit scene ─────────────────────────────────────────────────────────────

export const submitSceneSchema = z.object({
  sceneId: z.string().min(1),            // capture app's internal scene ID
  panoramaUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional().nullable(),
  heading: z.number().min(0).max(360).optional().nullable(),
  displayOrder: z.number().int().min(0).default(0),
});

export type SubmitSceneInput = z.infer<typeof submitSceneSchema>;

// ─── Submit photo ─────────────────────────────────────────────────────────────

export const submitPhotoSchema = z.object({
  sceneId: z.string().optional().nullable(),   // capture app's sceneId
  shelfExternalId: z.string().optional().nullable(), // capture app's shelfId from baseline tour
  photoUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional().nullable(),
  photoType: z.enum(['shelf', 'panorama_crop', 'manual']).default('shelf'),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type SubmitPhotoInput = z.infer<typeof submitPhotoSchema>;

// ─── Submit full survey ───────────────────────────────────────────────────────
// Capture app can either stream scenes/photos individually OR send everything at once here

export const submitSurveySchema = z.object({
  scenes: z.array(submitSceneSchema).min(1, 'At least one scene is required'),
  photos: z.array(submitPhotoSchema).default([]),
  completedAt: z.string().datetime().optional(),
});

export type SubmitSurveyInput = z.infer<typeof submitSurveySchema>;

// ─── Upload URL request ───────────────────────────────────────────────────────

export const uploadUrlSchema = z.object({
  filename: z.string().min(1),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  uploadType: z.enum(['scene', 'shelf', 'thumbnail']),
});

export type UploadUrlInput = z.infer<typeof uploadUrlSchema>;

// ─── List surveys ─────────────────────────────────────────────────────────────

export const listSurveysSchema = z.object({
  storeId: z.string().uuid().optional(),
  status: z.enum(['in_progress', 'completed', 'processing']).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(25),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ListSurveysQuery = z.infer<typeof listSurveysSchema>;

// ─── My slots (surveyor) ──────────────────────────────────────────────────────

export const mySlotsSchema = z.object({
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'missed', 'cancelled', 'skipped', 'excused']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(25),
});

export type MySlotsQuery = z.infer<typeof mySlotsSchema>;
