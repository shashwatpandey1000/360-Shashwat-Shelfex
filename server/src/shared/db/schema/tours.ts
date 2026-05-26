import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  decimal,
  index,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { stores } from './stores';
import { users } from './users';

// Tours
export const tours = pgTable(
  'tours',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id),
    version: integer('version').notNull().default(1),
    status: text('status').notNull().default('processing'), // 'processing' | 'active' | 'archived'
    capturedBy: uuid('captured_by').references(() => users.id),
    tourManifest: jsonb('tour_manifest').notNull(), // full tour.json
    sceneCount: integer('scene_count').notNull().default(0),
    shelfCount: integer('shelf_count').notNull().default(0),
    isBaseline: boolean('is_baseline').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('tours_store_status_idx').on(t.storeId, t.status),
    index('tours_org_store_idx').on(t.orgId, t.storeId),
    index('tours_store_created_idx').on(t.storeId, t.createdAt),
  ],
);

// Scenes
export const scenes = pgTable(
  'scenes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id),
    tourId: uuid('tour_id')
      .notNull()
      .references(() => tours.id, { onDelete: 'cascade' }),
    externalSceneId: text('external_scene_id').notNull(),
    panoramaUrl: text('panorama_url').notNull(),
    thumbnailUrl: text('thumbnail_url'),
    captureStartHeading: decimal('capture_start_heading', { precision: 6, scale: 2 }),
    latitude: decimal('latitude', { precision: 10, scale: 7 }),
    longitude: decimal('longitude', { precision: 10, scale: 7 }),
    label: text('label'),
    displayOrder: integer('display_order').notNull().default(0),
    floor: integer('floor').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('scenes_org_id_idx').on(t.orgId),
    index('scenes_tour_id_idx').on(t.tourId),
    index('scenes_tour_order_idx').on(t.tourId, t.displayOrder),
  ],
);

// Shelves
export const shelves = pgTable(
  'shelves',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id),
    tourId: uuid('tour_id')
      .notNull()
      .references(() => tours.id, { onDelete: 'cascade' }),
    sceneId: uuid('scene_id')
      .notNull()
      .references(() => scenes.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    yaw: decimal('yaw', { precision: 6, scale: 2 }).notNull(),
    pitch: decimal('pitch', { precision: 6, scale: 2 }).notNull(),
    boundingBox: jsonb('bounding_box'), // { yawLeft, yawRight, pitchTop, pitchBottom }
    shelfImageUrl: text('shelf_image_url'),
    displayOrder: integer('display_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('shelves_org_id_idx').on(t.orgId),
    index('shelves_tour_id_idx').on(t.tourId),
    index('shelves_scene_id_idx').on(t.sceneId),
  ],
);
