import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

// Users
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ssoUserId: uuid('sso_user_id').unique(), // nullable — null for invited users who haven't registered on SSO yet
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id),
    email: text('email').notNull(),
    name: text('name'),
    phone: text('phone'),
    avatarUrl: text('avatar_url'),
    roleTemplate: text('role_template').notNull(), // 'org_manager' | 'zone_manager' | 'store_manager' | 'surveyor' | 'custom'
    scopeType: text('scope_type').notNull(), // 'org' | 'zones' | 'stores'
    status: text('status').notNull().default('active'), // 'active' | 'inactive' | 'pending_first_login'
    languagePreference: text('language_preference'),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdBy: uuid('created_by'), // self-referential FK to users
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('users_org_id_idx').on(t.orgId),
    index('users_org_role_idx').on(t.orgId, t.roleTemplate),
    index('users_org_status_idx').on(t.orgId, t.status),
    index('users_org_scope_idx').on(t.orgId, t.scopeType),
    index('users_email_idx').on(t.email),
  ],
);

// Role Templates
export const roleTemplates = pgTable(
  'role_templates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orgId: uuid('org_id').references(() => organizations.id), // null = system default
    name: text('name').notNull(), // 'org_manager' | 'zone_manager' | 'store_manager' | 'surveyor'
    displayName: text('display_name').notNull(),
    description: text('description'),
    isSystem: boolean('is_system').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('role_templates_org_id_idx').on(t.orgId),
    uniqueIndex('role_templates_org_name_uniq').on(t.orgId, t.name),
  ],
);

// Role Template Permissions (IAM-style)
export const roleTemplatePermissions = pgTable(
  'role_template_permissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orgId: uuid('org_id').references(() => organizations.id),
    roleTemplateId: uuid('role_template_id')
      .notNull()
      .references(() => roleTemplates.id, { onDelete: 'cascade' }),
    permission: text('permission').notNull(), // 'stores:read', 'surveys:execute', etc.
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('rtp_org_id_idx').on(t.orgId),
    index('rtp_role_template_id_idx').on(t.roleTemplateId),
    uniqueIndex('rtp_template_permission_uniq').on(t.roleTemplateId, t.permission),
  ],
);

// User Permissions (IAM-style)
export const userPermissions = pgTable(
  'user_permissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    permission: text('permission').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('user_permissions_user_id_idx').on(t.userId),
    uniqueIndex('user_permissions_user_perm_uniq').on(t.userId, t.permission),
  ],
);

// User Data Scopes
export const userDataScopes = pgTable(
  'user_data_scopes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    scopeEntityId: uuid('scope_entity_id').notNull(), // zone_id or store_id depending on user.scope_type
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('user_data_scopes_user_id_idx').on(t.userId)],
);
