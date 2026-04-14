import { pgTable, uuid, text, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { industries } from './lookups';

// Super Admins
export const superAdmins = pgTable('super_admins', {
  id: uuid('id').defaultRandom().primaryKey(),
  ssoUserId: uuid('sso_user_id').notNull().unique(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  status: text('status').notNull().default('active'), // 'active' | 'inactive'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Organizations
export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    type: text('type').notNull(), // 'chain' | 'single_store'
    status: text('status').notNull().default('pending_approval'), // 'pending_approval' | 'active' | 'rejected' | 'suspended'
    industryId: uuid('industry_id').references(() => industries.id),
    country: text('country').notNull().default('IN'),
    currency: text('currency').notNull().default('INR'),
    timezone: text('timezone').notNull().default('Asia/Kolkata'),
    defaultLanguage: text('default_language').notNull().default('en'),
    logoUrl: text('logo_url'),
    website: text('website'),
    hqAddress: jsonb('hq_address'), // { street, city, state, postal_code, country, lat, lng }
    contactEmail: text('contact_email').notNull(),
    contactPhone: text('contact_phone'),
    settings: jsonb('settings').notNull().default({}), // { notification_prefs: {...} }
    approvedBy: uuid('approved_by').references(() => superAdmins.id),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    rejectedAt: timestamp('rejected_at', { withTimezone: true }),
    rejectionReason: text('rejection_reason'),
    createdBy: uuid('created_by'), // sso_user_id of the person who registered
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('organizations_status_idx').on(t.status),
    index('organizations_country_idx').on(t.country),
  ],
);

// Zones
export const zones = pgTable(
  'zones',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id),
    parentZoneId: uuid('parent_zone_id'), // self-referential, handled via relation
    name: text('name').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('zones_org_id_idx').on(t.orgId),
    index('zones_org_parent_idx').on(t.orgId, t.parentZoneId),
    uniqueIndex('zones_org_name_uniq').on(t.orgId, t.name),
  ],
);
