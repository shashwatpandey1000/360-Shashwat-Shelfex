import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  decimal,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { stores } from './stores';
import { users } from './users';
import { tours, scenes, shelves } from './tours';
import { scheduleInstances } from './schedule';
import { formDefinitions } from './forms';

// Surveys
export const surveys = pgTable(
  'surveys',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id),
    scheduleInstanceId: uuid('schedule_instance_id').references(() => scheduleInstances.id),
    tourId: uuid('tour_id').references(() => tours.id),
    surveyorId: uuid('surveyor_id')
      .notNull()
      .references(() => users.id),
    status: text('status').notNull().default('in_progress'), // 'in_progress' | 'completed' | 'processing'
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    durationSeconds: integer('duration_seconds'),
    tourManifest: jsonb('tour_manifest'), // fresh 360 capture
    sceneCount: integer('scene_count').notNull().default(0),
    shelfCount: integer('shelf_count').notNull().default(0),
    questionsAnswered: integer('questions_answered').notNull().default(0),
    questionsTotal: integer('questions_total').notNull().default(0),
    formDefinitionId: uuid('form_definition_id').references(() => formDefinitions.id),
    metadata: jsonb('metadata'), // { device_info, app_version, ... }
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('surveys_org_created_idx').on(t.orgId, t.createdAt),
    index('surveys_store_created_idx').on(t.storeId, t.createdAt),
    index('surveys_surveyor_created_idx').on(t.surveyorId, t.createdAt),
    index('surveys_store_status_idx').on(t.storeId, t.status),
    index('surveys_schedule_instance_idx').on(t.scheduleInstanceId),
  ],
);

// Survey Scenes
export const surveyScenes = pgTable(
  'survey_scenes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id),
    surveyId: uuid('survey_id')
      .notNull()
      .references(() => surveys.id, { onDelete: 'cascade' }),
    externalSceneId: text('external_scene_id').notNull(),
    baselineSceneId: uuid('baseline_scene_id').references(() => scenes.id),
    panoramaUrl: text('panorama_url').notNull(),
    thumbnailUrl: text('thumbnail_url'),
    captureStartHeading: decimal('capture_start_heading', { precision: 6, scale: 2 }),
    displayOrder: integer('display_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('survey_scenes_org_idx').on(t.orgId),
    index('survey_scenes_survey_idx').on(t.surveyId),
  ],
);

// Survey Photos
export const surveyPhotos = pgTable(
  'survey_photos',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    surveyId: uuid('survey_id')
      .notNull()
      .references(() => surveys.id, { onDelete: 'cascade' }),
    surveySceneId: uuid('survey_scene_id').references(() => surveyScenes.id),
    shelfId: uuid('shelf_id').references(() => shelves.id),
    photoUrl: text('photo_url').notNull(),
    thumbnailUrl: text('thumbnail_url'),
    photoType: text('photo_type').notNull().default('shelf'), // 'shelf' | 'panorama_crop' | 'manual'
    aiStatus: text('ai_status').notNull().default('pending'), // 'pending' | 'processing' | 'completed' | 'failed' | 'not_applicable'
    metadata: jsonb('metadata'), // { exif, dimensions, file_size, capture_time }
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('survey_photos_survey_idx').on(t.surveyId),
    index('survey_photos_shelf_idx').on(t.shelfId),
    index('survey_photos_ai_status_idx')
      .on(t.aiStatus)
      .where(sql`${t.aiStatus} IN ('pending', 'processing')`),
  ],
);

// Need sql import for where clause
import { sql } from 'drizzle-orm';

// Survey AI Results
export const surveyAiResults = pgTable(
  'survey_ai_results',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    surveyPhotoId: uuid('survey_photo_id')
      .notNull()
      .unique()
      .references(() => surveyPhotos.id),
    surveyId: uuid('survey_id')
      .notNull()
      .references(() => surveys.id),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id),
    status: text('status').notNull().default('pending'), // 'pending' | 'processing' | 'completed' | 'failed'
    products: jsonb('products'), // [{ name, brand, sku, position, confidence }]
    productCount: integer('product_count').notNull().default(0),
    processingTimeMs: integer('processing_time_ms'),
    errorMessage: text('error_message'),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('survey_ai_results_survey_idx').on(t.surveyId),
    index('survey_ai_results_store_created_idx').on(t.storeId, t.createdAt),
    index('survey_ai_results_status_idx')
      .on(t.status)
      .where(sql`${t.status} IN ('pending', 'processing')`),
  ],
);
