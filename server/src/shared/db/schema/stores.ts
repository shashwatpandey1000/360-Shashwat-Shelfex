import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { organizations, zones } from './organizations';
import { users } from './users';
import { storeCategories } from './lookups';

// Stores
export const stores = pgTable(
  'stores',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id),
    zoneId: uuid('zone_id').references(() => zones.id),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    status: text('status').notNull().default('pending_tour'), // 'pending_tour' | 'active' | 'inactive'
    categoryId: uuid('category_id').references(() => storeCategories.id),
    address: jsonb('address').notNull(), // { street, city, state, postal_code, country, formatted_address }
    location: jsonb('location'), // { latitude, longitude }
    timezone: text('timezone'), // IANA timezone, falls back to org
    operatingHours: jsonb('operating_hours'), // { mon: { open, close }, ... }
    contactPhone: text('contact_phone'),
    contactEmail: text('contact_email'),
    logoUrl: text('logo_url'),
    managerId: uuid('manager_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('stores_org_id_idx').on(t.orgId),
    index('stores_org_status_idx').on(t.orgId, t.status),
    index('stores_org_zone_idx').on(t.orgId, t.zoneId),
    index('stores_manager_idx').on(t.managerId),
    uniqueIndex('stores_org_slug_uniq').on(t.orgId, t.slug),
  ],
);

// Store Surveyors (Many-to-Many)
export const storeSurveyors = pgTable(
  'store_surveyors',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    assignedBy: uuid('assigned_by')
      .notNull()
      .references(() => users.id),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deactivatedAt: timestamp('deactivated_at', { withTimezone: true }),
  },
  (t) => [
    index('store_surveyors_store_idx').on(t.storeId),
    index('store_surveyors_user_idx').on(t.userId),
    uniqueIndex('store_surveyors_store_user_uniq').on(t.storeId, t.userId),
  ],
);
