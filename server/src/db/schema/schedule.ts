import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  date,
  time,
  jsonb,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from './organizations';
import { stores } from './stores';
import { users } from './users';

// Schedule Templates
export const scheduleTemplates = pgTable(
  'schedule_templates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id),
    storeId: uuid('store_id').references(() => stores.id), // null = org-wide default
    name: text('name').notNull(),
    timezone: text('timezone').notNull(),
    effectiveFrom: date('effective_from').notNull(),
    effectiveUntil: date('effective_until'),
    isActive: boolean('is_active').notNull().default(true),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('sched_tmpl_org_active_idx').on(t.orgId).where(sql`${t.isActive} = true`),
    index('sched_tmpl_org_store_idx').on(t.orgId, t.storeId).where(sql`${t.isActive} = true`),
    index('sched_tmpl_store_idx')
      .on(t.storeId)
      .where(sql`${t.storeId} IS NOT NULL AND ${t.isActive} = true`),
  ],
);

// Recurrence Rules
export const recurrenceRules = pgTable(
  'recurrence_rules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id),
    scheduleTemplateId: uuid('schedule_template_id')
      .notNull()
      .references(() => scheduleTemplates.id, { onDelete: 'cascade' }),
    recurrenceType: text('recurrence_type').notNull(), // 'daily' | 'weekdays' | 'specific_days' | 'odd_days' | 'even_days' | 'interval' | 'custom_rrule'
    daysOfWeek: integer('days_of_week').array(), // [1,3,5] = Mon/Wed/Fri
    intervalValue: integer('interval_value'),
    intervalUnit: text('interval_unit'), // 'day' | 'week'
    customRrule: text('custom_rrule'), // RFC 5545 RRULE
    exceptions: jsonb('exceptions'), // { skip_dates: [...] }
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('recurrence_rules_org_idx').on(t.orgId),
    index('recurrence_rules_template_idx').on(t.scheduleTemplateId),
  ],
);

// Time Windows
export const timeWindows = pgTable(
  'time_windows',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id),
    recurrenceRuleId: uuid('recurrence_rule_id')
      .notNull()
      .references(() => recurrenceRules.id, { onDelete: 'cascade' }),
    windowStart: time('window_start').notNull(),
    windowEnd: time('window_end').notNull(),
    label: text('label'),
    displayOrder: integer('display_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('time_windows_org_idx').on(t.orgId),
    index('time_windows_rule_idx').on(t.recurrenceRuleId),
    check('window_end_after_start', sql`${t.windowEnd} > ${t.windowStart}`),
  ],
);

// Surveyor Assignments
export const surveyorAssignments = pgTable(
  'surveyor_assignments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id),
    recurrenceRuleId: uuid('recurrence_rule_id')
      .notNull()
      .references(() => recurrenceRules.id),
    timeWindowId: uuid('time_window_id')
      .notNull()
      .references(() => timeWindows.id),
    surveyorId: uuid('surveyor_id')
      .notNull()
      .references(() => users.id),
    assignedBy: uuid('assigned_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('surveyor_assign_org_idx').on(t.orgId),
    index('surveyor_assign_store_idx').on(t.storeId),
    index('surveyor_assign_surveyor_idx').on(t.surveyorId),
    uniqueIndex('surveyor_assign_slot_uniq').on(t.storeId, t.recurrenceRuleId, t.timeWindowId),
  ],
);

// Schedule Instances (materialized slots)
// Note: Partitioning by scheduled_date is handled at migration/DDL level, not Drizzle schema
export const scheduleInstances = pgTable(
  'schedule_instances',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id),
    scheduleTemplateId: uuid('schedule_template_id')
      .notNull()
      .references(() => scheduleTemplates.id),
    recurrenceRuleId: uuid('recurrence_rule_id')
      .notNull()
      .references(() => recurrenceRules.id),
    timeWindowId: uuid('time_window_id')
      .notNull()
      .references(() => timeWindows.id),
    scheduledDate: date('scheduled_date').notNull(),
    windowStartUtc: timestamp('window_start_utc', { withTimezone: true }).notNull(),
    windowEndUtc: timestamp('window_end_utc', { withTimezone: true }).notNull(),
    windowStartLocal: timestamp('window_start_local').notNull(),
    windowEndLocal: timestamp('window_end_local').notNull(),
    timezone: text('timezone').notNull(),
    status: text('status').notNull().default('pending'), // 'pending' | 'in_progress' | 'completed' | 'missed' | 'cancelled' | 'skipped' | 'excused'
    assignedSurveyorId: uuid('assigned_surveyor_id').references(() => users.id),
    assignedAt: timestamp('assigned_at', { withTimezone: true }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    surveyId: uuid('survey_id'), // FK to surveys — added as loose ref to avoid circular dep
    idempotencyKey: text('idempotency_key').notNull().unique(),
    materializedAt: timestamp('materialized_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('sched_inst_store_date_idx').on(t.storeId, t.scheduledDate),
    index('sched_inst_surveyor_date_idx')
      .on(t.assignedSurveyorId, t.scheduledDate)
      .where(sql`${t.status} IN ('pending', 'in_progress')`),
    index('sched_inst_org_date_idx').on(t.orgId, t.scheduledDate),
    index('sched_inst_status_date_idx')
      .on(t.status, t.scheduledDate)
      .where(sql`${t.status} IN ('pending', 'in_progress')`),
    index('sched_inst_store_status_date_idx').on(t.storeId, t.status, t.scheduledDate),
  ],
);
