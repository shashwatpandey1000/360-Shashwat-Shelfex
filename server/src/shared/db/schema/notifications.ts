import { pgTable, uuid, text, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';

// Notifications
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    type: text('type').notNull(), // 'survey_reminder' | 'survey_completed' | 'survey_missed' | etc.
    title: text('title').notNull(),
    body: text('body').notNull(),
    link: text('link'),
    isRead: boolean('is_read').notNull().default(false),
    metadata: jsonb('metadata'), // { store_id, survey_id, etc. }
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
  },
  (t) => [
    index('notifications_user_unread_idx').on(t.userId, t.isRead, t.createdAt),
    index('notifications_user_created_idx').on(t.userId, t.createdAt),
    index('notifications_org_created_idx').on(t.orgId, t.createdAt),
  ],
);
