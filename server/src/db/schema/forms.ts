import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { stores } from './stores';
import { users } from './users';

// Form Definitions
export const formDefinitions = pgTable(
  'form_definitions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id),
    scopeType: text('scope_type').notNull(), // 'org_default' | 'store_override'
    scopeId: uuid('scope_id').notNull(), // org_id or store_id depending on scope_type
    lineageId: uuid('lineage_id').notNull(), // groups all versions of the same form
    version: integer('version').notNull().default(1),
    status: text('status').notNull().default('draft'), // 'draft' | 'published' | 'archived'
    definition: jsonb('definition').notNull(), // { schema_version, title, questions: [...], logic: [...] }
    createdBy: uuid('created_by').references(() => users.id),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('form_defs_org_scope_idx').on(t.orgId, t.scopeType, t.scopeId),
    index('form_defs_lineage_version_idx').on(t.lineageId, t.version),
    index('form_defs_lineage_published_idx')
      .on(t.lineageId, t.status)
      .where(sql`${t.status} = 'published'`),
    uniqueIndex('form_defs_lineage_version_uniq').on(t.lineageId, t.version),
  ],
);

import { sql } from 'drizzle-orm';

// Store Form Assignments
export const storeFormAssignments = pgTable('store_form_assignments', {
  storeId: uuid('store_id')
    .primaryKey()
    .references(() => stores.id),
  formLineageId: uuid('form_lineage_id'), // null = use org default
  assignedBy: uuid('assigned_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Survey Question Answers
export const surveyQuestionAnswers = pgTable(
  'survey_question_answers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    surveyId: uuid('survey_id').notNull(), // FK to surveys — loose ref to avoid circular dep
    formDefinitionId: uuid('form_definition_id')
      .notNull()
      .references(() => formDefinitions.id),
    questionId: text('question_id').notNull(), // matches question.id in form definition JSON
    questionType: text('question_type').notNull(), // 'yes_no' | 'mcq' | 'rating_scale' | 'short_text'
    answerValue: jsonb('answer_value').notNull(),
    answeredAt: timestamp('answered_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('survey_answers_survey_idx').on(t.surveyId),
    uniqueIndex('survey_answers_survey_question_uniq').on(t.surveyId, t.questionId),
  ],
);
