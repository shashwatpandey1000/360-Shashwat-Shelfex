# ShelfEx 360 — Database Schema Design

> **Database:** PostgreSQL (Neon for dev, RDS for production)
> **ORM:** Drizzle
> **Multi-tenancy:** Shared schema, `org_id` on every business table
> **Timestamps:** All `TIMESTAMPTZ` (stored as UTC)
> **IDs:** UUID v4 (via `gen_random_uuid()`)
> **Naming:** snake_case for tables and columns

---

## Table of Contents

1. [Organization & Geography](#1-organization--geography)
2. [Users & Access Control](#2-users--access-control)
3. [Store Management](#3-store-management)
4. [Tour System](#4-tour-system)
5. [Schedule Engine](#5-schedule-engine)
6. [Survey System](#6-survey-system)
7. [Form Engine](#7-form-engine)
8. [Lookups & Reference Data](#8-lookups--reference-data)
9. [Notifications (PostgreSQL-side)](#9-notifications)
10. [Entity Relationship Diagram](#10-entity-relationship-diagram)
11. [Indexes & Performance](#11-indexes--performance)
12. [Partitioning Strategy](#12-partitioning-strategy)
13. [Row-Level Security](#13-row-level-security)

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| **360 has its own `users` table** | SSO owns identity (email, password, email_verified). 360 owns org membership, role, access map, status within the platform. Linked by `sso_user_id`. |
| **Access map is normalized (not a single JSONB blob)** | Queryable, indexable, auditable. Materialized into a JSON blob for Redis cache + API responses. |
| **Tour manifest stored as JSONB** | Tour data comes from capture app as a JSON document. Storing the full manifest allows flexible schema evolution without migrations. Key fields also extracted into relational columns for querying. |
| **Schedule instances are the query hotspot** | Every "what's happening today" query hits this table. Partitioned by `scheduled_date`, heavily indexed. |
| **Form definitions are versioned JSONB** | Forms evolve over time. Old survey responses must reference the exact form version they answered. |
| **`org_id` on almost every table** | Enables efficient tenant-scoped queries and future RLS policies. Even on tables reachable via joins, for direct query performance. |
| **Soft deletes where business requires** | Users, stores, orgs use `status` field (never hard delete). Schedule instances use status state machine. |
| **No monetary tables in v1** | No billing/payments in the initial build. Currency is an org setting for display purposes only. |

---

## 1. Organization & Geography

### `organizations`

The tenant root. Every business entity in the system belongs to an organization.

```
organizations
├── id                  UUID        PK, default gen_random_uuid()
├── name                TEXT        NOT NULL
├── slug                TEXT        NOT NULL, UNIQUE  -- for URLs if needed
├── type                TEXT        NOT NULL           -- 'chain' | 'single_store'
├── status              TEXT        NOT NULL, default 'pending_approval'
│                                   -- 'pending_approval' | 'active' | 'rejected' | 'suspended'
├── industry_id         UUID        FK → industries, nullable
├── country             TEXT        NOT NULL, default 'IN'  -- ISO 3166-1 alpha-2
├── currency            TEXT        NOT NULL, default 'INR' -- ISO 4217
├── timezone            TEXT        NOT NULL, default 'Asia/Kolkata' -- IANA timezone
├── default_language    TEXT        NOT NULL, default 'en'
├── logo_url            TEXT        nullable
├── website             TEXT        nullable
├── hq_address          JSONB       nullable
│                                   -- { street, city, state, postal_code, country, lat, lng }
├── contact_email       TEXT        NOT NULL
├── contact_phone       TEXT        nullable
├── settings            JSONB       NOT NULL, default '{}'
│                                   -- { notification_prefs: { missed_survey_daily: true, weekly_report: true, new_manager_login: true } }
├── approved_by         UUID        nullable  -- super admin who approved
├── approved_at         TIMESTAMPTZ nullable
├── rejected_at         TIMESTAMPTZ nullable
├── rejection_reason    TEXT        nullable
├── created_at          TIMESTAMPTZ NOT NULL, default now()
└── updated_at          TIMESTAMPTZ NOT NULL, default now()

Indexes:
  - UNIQUE (slug)
  - (status)
  - (country)
```

### `zones`

Geographic groupings within an org. Hierarchical — a zone can contain sub-zones.

```
zones
├── id                  UUID        PK
├── org_id              UUID        NOT NULL, FK → organizations
├── parent_zone_id      UUID        nullable, FK → zones (self-referential)
├── name                TEXT        NOT NULL
├── description         TEXT        nullable
├── created_at          TIMESTAMPTZ NOT NULL, default now()
└── updated_at          TIMESTAMPTZ NOT NULL, default now()

Indexes:
  - (org_id)
  - (org_id, parent_zone_id)

Constraints:
  - UNIQUE (org_id, name)  -- zone names unique within an org
```

---

## 2. Users & Access Control

### `users` (360-local user records)

Every user who accesses 360 gets a record here. Linked to SSO identity via `sso_user_id`.

```
users
├── id                  UUID        PK
├── sso_user_id         UUID        NOT NULL, UNIQUE  -- FK to SSO users table (logical, not physical FK)
├── org_id              UUID        NOT NULL, FK → organizations
├── email               TEXT        NOT NULL           -- denormalized from SSO for display/query
├── name                TEXT        nullable
├── phone               TEXT        nullable
├── avatar_url          TEXT        nullable
├── role_template       TEXT        NOT NULL
│                                   -- 'org_manager' | 'zone_manager' | 'store_manager' | 'surveyor' | 'custom'
├── status              TEXT        NOT NULL, default 'active'
│                                   -- 'active' | 'inactive' | 'pending_first_login'
├── language_preference TEXT        nullable           -- user's preferred language, overrides org default
├── last_login_at       TIMESTAMPTZ nullable
├── created_by          UUID        nullable, FK → users (who created this user)
├── created_at          TIMESTAMPTZ NOT NULL, default now()
└── updated_at          TIMESTAMPTZ NOT NULL, default now()

Indexes:
  - UNIQUE (sso_user_id)
  - (org_id)
  - (org_id, role_template)
  - (org_id, status)
  - (email)
```

### `role_templates`

Preset permission templates. Each org can customize its templates (or use system defaults).

```
role_templates
├── id                  UUID        PK
├── org_id              UUID        nullable, FK → organizations
│                                   -- null = system-wide default template
├── name                TEXT        NOT NULL  -- 'org_manager' | 'zone_manager' | 'store_manager' | 'surveyor'
├── display_name        TEXT        NOT NULL  -- "Organization Manager", "Store Manager", etc.
├── description         TEXT        nullable
├── is_system           BOOLEAN     NOT NULL, default false  -- true = system defaults, cannot be deleted
├── created_at          TIMESTAMPTZ NOT NULL, default now()
└── updated_at          TIMESTAMPTZ NOT NULL, default now()

Indexes:
  - (org_id)

Constraints:
  - UNIQUE (org_id, name)  -- one template per name per org (null org_id = system defaults)
```

### `role_template_modules`

Module-level permissions per role template.

```
role_template_modules
├── id                  UUID        PK
├── role_template_id    UUID        NOT NULL, FK → role_templates
├── module              TEXT        NOT NULL
│                                   -- 'dashboard' | 'stores' | 'surveys' | 'employees' | 'schedule' | 'settings'
├── can_read            BOOLEAN     NOT NULL, default false
├── can_write           BOOLEAN     NOT NULL, default false
├── can_delete          BOOLEAN     NOT NULL, default false
└── can_download        BOOLEAN     NOT NULL, default false

Constraints:
  - UNIQUE (role_template_id, module)
```

### `role_template_capabilities`

Capability flags per role template.

```
role_template_capabilities
├── id                  UUID        PK
├── role_template_id    UUID        NOT NULL, FK → role_templates
├── capability          TEXT        NOT NULL
│                                   -- 'survey_execution' | 'employee_management' | 'schedule_management' | 'store_management'
└── enabled             BOOLEAN     NOT NULL, default false

Constraints:
  - UNIQUE (role_template_id, capability)
```

### `user_module_permissions`

Materialized module permissions per user. Written when user is created/updated.

```
user_module_permissions
├── id                  UUID        PK
├── user_id             UUID        NOT NULL, FK → users
├── module              TEXT        NOT NULL
│                                   -- 'dashboard' | 'stores' | 'surveys' | 'employees' | 'schedule' | 'settings'
├── can_read            BOOLEAN     NOT NULL, default false
├── can_write           BOOLEAN     NOT NULL, default false
├── can_delete          BOOLEAN     NOT NULL, default false
└── can_download        BOOLEAN     NOT NULL, default false

Indexes:
  - (user_id)

Constraints:
  - UNIQUE (user_id, module)
```

### `user_data_scopes`

Defines which data a user can see. A user has one scope type but may have multiple scope entries (e.g., access to 3 specific stores).

```
user_data_scopes
├── id                  UUID        PK
├── user_id             UUID        NOT NULL, FK → users
├── scope_type          TEXT        NOT NULL
│                                   -- 'org' | 'zones' | 'stores'
├── scope_entity_id     UUID        nullable
│                                   -- null when scope_type = 'org' (means full org access)
│                                   -- zone_id when scope_type = 'zones'
│                                   -- store_id when scope_type = 'stores'
└── created_at          TIMESTAMPTZ NOT NULL, default now()

Indexes:
  - (user_id)
  - (user_id, scope_type)

Constraints:
  - When scope_type = 'org', scope_entity_id must be null (enforced via CHECK or app logic)
```

### `user_capabilities`

Per-user capability flags.

```
user_capabilities
├── id                  UUID        PK
├── user_id             UUID        NOT NULL, FK → users
├── capability          TEXT        NOT NULL
│                                   -- 'survey_execution' | 'employee_management' | 'schedule_management' | 'store_management'
└── enabled             BOOLEAN     NOT NULL, default false

Indexes:
  - (user_id)

Constraints:
  - UNIQUE (user_id, capability)
```

### Access Map Materialization

Not a table — a Redis-cached JSON blob built from the three tables above:

```jsonc
{
  "user_id": "uuid",
  "org_id": "uuid",
  "role_template": "store_manager",
  "data_scope": {
    "type": "stores",
    "store_ids": ["uuid-1", "uuid-2"]    // resolved from user_data_scopes
    // or "zone_ids": [...] when type = "zones"
  },
  "modules": {
    "dashboard":  { "read": true, "write": false, "delete": false, "download": false },
    "stores":     { "read": true, "write": false, "delete": false, "download": false },
    "surveys":    { "read": true, "write": false, "delete": false, "download": false },
    "employees":  { "read": true, "write": true, "delete": false, "download": false },
    "schedule":   { "read": true, "write": false, "delete": false, "download": false },
    "settings":   { "read": true, "write": false, "delete": false, "download": false }
  },
  "capabilities": {
    "survey_execution": false,
    "employee_management": true,
    "schedule_management": false,
    "store_management": false
  }
}
```

---

## 3. Store Management

### `stores`

Physical store locations.

```
stores
├── id                  UUID        PK
├── org_id              UUID        NOT NULL, FK → organizations
├── zone_id             UUID        nullable, FK → zones
├── name                TEXT        NOT NULL
├── slug                TEXT        NOT NULL  -- for public URL: shelfex360.com/{slug}
├── status              TEXT        NOT NULL, default 'pending_tour'
│                                   -- 'pending_tour' | 'active' | 'inactive'
├── category_id         UUID        nullable, FK → store_categories
├── address             JSONB       NOT NULL
│                                   -- { street, city, state, postal_code, country, formatted_address }
├── location            JSONB       nullable
│                                   -- { latitude, longitude } — from Google Places
├── timezone            TEXT        nullable  -- IANA timezone, falls back to org timezone if null
├── operating_hours     JSONB       nullable
│                                   -- { mon: { open: "09:00", close: "21:00" }, tue: {...}, ... }
├── contact_phone       TEXT        nullable
├── contact_email       TEXT        nullable
├── logo_url            TEXT        nullable
├── manager_id          UUID        nullable, FK → users  -- current store manager
├── created_at          TIMESTAMPTZ NOT NULL, default now()
└── updated_at          TIMESTAMPTZ NOT NULL, default now()

Indexes:
  - UNIQUE (slug)
  - (org_id)
  - (org_id, status)
  - (org_id, zone_id)
  - (manager_id)

Constraints:
  - UNIQUE (org_id, slug)  -- slugs globally unique but also indexed per org
```

### `store_surveyors`

Many-to-many: which surveyors are assigned to which stores (not the same as schedule slot assignment — this is "this surveyor works at this store").

```
store_surveyors
├── id                  UUID        PK
├── store_id            UUID        NOT NULL, FK → stores
├── user_id             UUID        NOT NULL, FK → users
├── assigned_by         UUID        NOT NULL, FK → users  -- the store manager who assigned them
├── is_active           BOOLEAN     NOT NULL, default true
├── created_at          TIMESTAMPTZ NOT NULL, default now()
└── deactivated_at      TIMESTAMPTZ nullable

Indexes:
  - (store_id)
  - (user_id)
  - (store_id, user_id) WHERE is_active = true

Constraints:
  - UNIQUE (store_id, user_id)  -- a surveyor can only be assigned once per store
```

---

## 4. Tour System

### `tours`

360° tours created by the capture app. A store can have multiple tours over time (baseline + updates).

```
tours
├── id                  UUID        PK
├── org_id              UUID        NOT NULL, FK → organizations
├── store_id            UUID        NOT NULL, FK → stores
├── version             INTEGER     NOT NULL, default 1  -- increments on re-capture
├── status              TEXT        NOT NULL, default 'processing'
│                                   -- 'processing' | 'active' | 'archived'
├── captured_by         UUID        nullable, FK → users
├── tour_manifest       JSONB       NOT NULL
│                                   -- full tour.json as defined in TOUR_DATA_CONTRACT.md
│                                   -- { tourId, scenes: [...], hotspots: [...], shelfHotspots: [...] }
├── scene_count         INTEGER     NOT NULL, default 0  -- denormalized for quick display
├── shelf_count         INTEGER     NOT NULL, default 0  -- denormalized
├── is_baseline         BOOLEAN     NOT NULL, default false  -- true for the initial store tour
├── created_at          TIMESTAMPTZ NOT NULL, default now()
└── updated_at          TIMESTAMPTZ NOT NULL, default now()

Indexes:
  - (store_id, status)  -- "get active tour for this store"
  - (org_id, store_id)
  - (store_id, created_at DESC)  -- "latest tour for store"
```

### `scenes`

Individual panoramic scenes within a tour. Extracted from tour_manifest for relational querying.

```
scenes
├── id                  UUID        PK
├── tour_id             UUID        NOT NULL, FK → tours ON DELETE CASCADE
├── external_scene_id   TEXT        NOT NULL  -- scene_id from capture app (e.g., "scene_1773473905042")
├── panorama_url        TEXT        NOT NULL  -- CDN URL to stitched panorama
├── thumbnail_url       TEXT        nullable  -- 400px preview
├── capture_start_heading DECIMAL(6,2) nullable  -- compass bearing 0-360
├── latitude            DECIMAL(10,7) nullable
├── longitude           DECIMAL(10,7) nullable
├── label               TEXT        nullable  -- "Entrance", "Aisle 3"
├── display_order       INTEGER     NOT NULL, default 0
├── floor               INTEGER     NOT NULL, default 0  -- multi-floor future
├── created_at          TIMESTAMPTZ NOT NULL, default now()
└── updated_at          TIMESTAMPTZ NOT NULL, default now()

Indexes:
  - (tour_id)
  - (tour_id, display_order)
```

### `shelves`

Shelf markers placed on panoramic scenes. These are the "hotspots" where survey photos and AI results get linked.

```
shelves
├── id                  UUID        PK
├── tour_id             UUID        NOT NULL, FK → tours ON DELETE CASCADE
├── scene_id            UUID        NOT NULL, FK → scenes ON DELETE CASCADE
├── label               TEXT        NOT NULL  -- "Shelf A1 — Snacks"
├── yaw                 DECIMAL(6,2) NOT NULL  -- position in panorama (0-360)
├── pitch               DECIMAL(6,2) NOT NULL  -- vertical position
├── bounding_box        JSONB       nullable
│                                   -- { yawLeft, yawRight, pitchTop, pitchBottom }
├── shelf_image_url     TEXT        nullable  -- pre-cropped shelf photo
├── display_order       INTEGER     NOT NULL, default 0
├── created_at          TIMESTAMPTZ NOT NULL, default now()
└── updated_at          TIMESTAMPTZ NOT NULL, default now()

Indexes:
  - (tour_id)
  - (scene_id)
```

---

## 5. Schedule Engine

### `schedule_templates`

Defines when surveys should happen. Can be org-wide (store_id = null) or per-store override.

```
schedule_templates
├── id                  UUID        PK
├── org_id              UUID        NOT NULL, FK → organizations
├── store_id            UUID        nullable, FK → stores
│                                   -- null = org-wide default; set = per-store override
├── name                TEXT        NOT NULL  -- "Default 2x Daily", "Store #42 Custom"
├── timezone            TEXT        NOT NULL  -- IANA timezone (inherited from store or org)
├── effective_from      DATE        NOT NULL
├── effective_until     DATE        nullable  -- null = no end date
├── is_active           BOOLEAN     NOT NULL, default true
├── created_by          UUID        nullable, FK → users
├── created_at          TIMESTAMPTZ NOT NULL, default now()
└── updated_at          TIMESTAMPTZ NOT NULL, default now()

Indexes:
  - (org_id) WHERE is_active = true
  - (org_id, store_id) WHERE is_active = true
  - (store_id) WHERE store_id IS NOT NULL AND is_active = true
```

### `recurrence_rules`

Defines the pattern of when a schedule repeats. A template can have multiple recurrence rules (e.g., weekday rule + weekend rule with different windows).

```
recurrence_rules
├── id                  UUID        PK
├── schedule_template_id UUID       NOT NULL, FK → schedule_templates ON DELETE CASCADE
├── recurrence_type     TEXT        NOT NULL
│                                   -- 'daily' | 'weekdays' | 'specific_days' | 'odd_days' | 'even_days' | 'interval' | 'custom_rrule'
├── days_of_week        INTEGER[]   nullable  -- [1,3,5] = Mon/Wed/Fri (ISO: 1=Mon, 7=Sun)
├── interval_value      INTEGER     nullable  -- every N days/weeks
├── interval_unit       TEXT        nullable  -- 'day' | 'week'
├── custom_rrule        TEXT        nullable  -- RFC 5545 RRULE string for future flexibility
├── exceptions          JSONB       nullable  -- { skip_dates: ["2026-04-15", "2026-12-25"] }
├── created_at          TIMESTAMPTZ NOT NULL, default now()
└── updated_at          TIMESTAMPTZ NOT NULL, default now()

Indexes:
  - (schedule_template_id)
```

### `time_windows`

Time slots within a recurrence rule. Each window is one survey opportunity per day.

```
time_windows
├── id                  UUID        PK
├── recurrence_rule_id  UUID        NOT NULL, FK → recurrence_rules ON DELETE CASCADE
├── window_start        TIME        NOT NULL  -- local time, e.g., '08:00'
├── window_end          TIME        NOT NULL  -- local time, e.g., '13:00'
├── label               TEXT        nullable  -- "Morning Window", "Evening Window"
├── display_order       INTEGER     NOT NULL, default 0
├── created_at          TIMESTAMPTZ NOT NULL, default now()
└── updated_at          TIMESTAMPTZ NOT NULL, default now()

Indexes:
  - (recurrence_rule_id)

Constraints:
  - CHECK (window_end > window_start)
```

### `surveyor_assignments`

Persistent mapping: "For this store + recurrence rule + time window, this surveyor is the default assignee." Applied automatically when slots are materialized.

```
surveyor_assignments
├── id                  UUID        PK
├── store_id            UUID        NOT NULL, FK → stores
├── recurrence_rule_id  UUID        NOT NULL, FK → recurrence_rules
├── time_window_id      UUID        NOT NULL, FK → time_windows
├── surveyor_id         UUID        NOT NULL, FK → users
├── assigned_by         UUID        NOT NULL, FK → users  -- the store manager
├── created_at          TIMESTAMPTZ NOT NULL, default now()
└── updated_at          TIMESTAMPTZ NOT NULL, default now()

Indexes:
  - (store_id)
  - (surveyor_id)

Constraints:
  - UNIQUE (store_id, recurrence_rule_id, time_window_id)
    -- only one surveyor per slot pattern per store
```

### `schedule_instances`

Materialized survey slots. This is the most queried table in the system. Generated by the slot materializer job. **Partitioned by `scheduled_date`.**

```
schedule_instances
├── id                  UUID        PK
├── org_id              UUID        NOT NULL, FK → organizations
├── store_id            UUID        NOT NULL, FK → stores
├── schedule_template_id UUID       NOT NULL, FK → schedule_templates
├── recurrence_rule_id  UUID        NOT NULL, FK → recurrence_rules
├── time_window_id      UUID        NOT NULL, FK → time_windows
├── scheduled_date      DATE        NOT NULL
├── window_start_utc    TIMESTAMPTZ NOT NULL  -- computed: local time + timezone → UTC
├── window_end_utc      TIMESTAMPTZ NOT NULL
├── window_start_local  TIMESTAMP   NOT NULL  -- denormalized for display without tz conversion
├── window_end_local    TIMESTAMP   NOT NULL
├── timezone            TEXT        NOT NULL  -- IANA timezone used for computation
├── status              TEXT        NOT NULL, default 'pending'
│                                   -- 'pending' | 'in_progress' | 'completed' | 'missed' | 'cancelled' | 'skipped' | 'excused'
├── assigned_surveyor_id UUID       nullable, FK → users
├── assigned_at         TIMESTAMPTZ nullable
├── started_at          TIMESTAMPTZ nullable
├── completed_at        TIMESTAMPTZ nullable
├── survey_id           UUID        nullable, FK → surveys  -- linked after survey submission
├── idempotency_key     TEXT        NOT NULL, UNIQUE
│                                   -- hash(template_id, rule_id, store_id, date, window_start)
│                                   -- prevents duplicate slot generation on re-runs
├── materialized_at     TIMESTAMPTZ NOT NULL, default now()
├── created_at          TIMESTAMPTZ NOT NULL, default now()
└── updated_at          TIMESTAMPTZ NOT NULL, default now()

Indexes:
  - UNIQUE (idempotency_key)
  - (store_id, scheduled_date)
  - (assigned_surveyor_id, scheduled_date) WHERE status IN ('pending', 'in_progress')
  - (org_id, scheduled_date)
  - (status, scheduled_date) WHERE status IN ('pending', 'in_progress')
  - (store_id, status, scheduled_date)

Partition:
  - RANGE on scheduled_date (monthly partitions)
  - e.g., schedule_instances_2026_04, schedule_instances_2026_05, ...
```

**Status state machine:**

```
pending → in_progress → completed
pending → missed → excused
pending → cancelled
pending → skipped (holiday/exception)
in_progress → completed
in_progress → missed (window expired while in progress)
```

---

## 6. Survey System

### `surveys`

A completed (or in-progress) survey record. One survey per schedule slot execution.

```
surveys
├── id                  UUID        PK
├── org_id              UUID        NOT NULL, FK → organizations
├── store_id            UUID        NOT NULL, FK → stores
├── schedule_instance_id UUID       nullable, FK → schedule_instances  -- null if ad-hoc survey
├── tour_id             UUID        nullable, FK → tours  -- the tour version active at time of survey
├── surveyor_id         UUID        NOT NULL, FK → users
├── status              TEXT        NOT NULL, default 'in_progress'
│                                   -- 'in_progress' | 'completed' | 'processing'
│                                   -- 'processing' = photos uploaded, awaiting AI results
├── started_at          TIMESTAMPTZ NOT NULL
├── completed_at        TIMESTAMPTZ nullable
├── duration_seconds    INTEGER     nullable  -- computed from started_at to completed_at
├── tour_manifest       JSONB       nullable
│                                   -- the fresh 360 capture for this survey (separate from baseline tour)
│                                   -- same format as tours.tour_manifest
├── scene_count         INTEGER     NOT NULL, default 0
├── shelf_count         INTEGER     NOT NULL, default 0
├── questions_answered  INTEGER     NOT NULL, default 0
├── questions_total     INTEGER     NOT NULL, default 0
├── form_definition_id  UUID        nullable, FK → form_definitions  -- exact version used
├── metadata            JSONB       nullable
│                                   -- { device_info, app_version, ... }
├── created_at          TIMESTAMPTZ NOT NULL, default now()
└── updated_at          TIMESTAMPTZ NOT NULL, default now()

Indexes:
  - (org_id, created_at DESC)
  - (store_id, created_at DESC)
  - (surveyor_id, created_at DESC)
  - (store_id, status)
  - (schedule_instance_id)

Partition:
  - RANGE on created_at (monthly partitions)
```

### `survey_scenes`

Scenes captured during a survey's fresh 360. Links to the original baseline scene for comparison.

```
survey_scenes
├── id                  UUID        PK
├── survey_id           UUID        NOT NULL, FK → surveys ON DELETE CASCADE
├── external_scene_id   TEXT        NOT NULL  -- scene_id from capture app
├── baseline_scene_id   UUID        nullable, FK → scenes  -- matching scene in baseline tour
├── panorama_url        TEXT        NOT NULL
├── thumbnail_url       TEXT        nullable
├── capture_start_heading DECIMAL(6,2) nullable
├── display_order       INTEGER     NOT NULL, default 0
├── created_at          TIMESTAMPTZ NOT NULL, default now()
└── updated_at          TIMESTAMPTZ NOT NULL, default now()

Indexes:
  - (survey_id)
```

### `survey_photos`

Individual shelf/area photos captured during a survey.

```
survey_photos
├── id                  UUID        PK
├── survey_id           UUID        NOT NULL, FK → surveys ON DELETE CASCADE
├── survey_scene_id     UUID        nullable, FK → survey_scenes
├── shelf_id            UUID        nullable, FK → shelves  -- shelf in baseline tour this photo corresponds to
├── photo_url           TEXT        NOT NULL  -- full-res CDN URL
├── thumbnail_url       TEXT        nullable  -- 400px preview
├── photo_type          TEXT        NOT NULL, default 'shelf'
│                                   -- 'shelf' | 'panorama_crop' | 'manual'
├── ai_status           TEXT        NOT NULL, default 'pending'
│                                   -- 'pending' | 'processing' | 'completed' | 'failed' | 'not_applicable'
├── metadata            JSONB       nullable
│                                   -- { exif, dimensions, file_size, capture_time }
├── created_at          TIMESTAMPTZ NOT NULL, default now()
└── updated_at          TIMESTAMPTZ NOT NULL, default now()

Indexes:
  - (survey_id)
  - (shelf_id)
  - (ai_status) WHERE ai_status IN ('pending', 'processing')

Partition:
  - RANGE on created_at (monthly partitions)
```

### `survey_ai_results`

AI product detection results per photo. One row per photo, products as JSONB array.

```
survey_ai_results
├── id                  UUID        PK
├── survey_photo_id     UUID        NOT NULL, FK → survey_photos, UNIQUE
├── survey_id           UUID        NOT NULL, FK → surveys  -- denormalized for direct query
├── store_id            UUID        NOT NULL, FK → stores   -- denormalized
├── status              TEXT        NOT NULL, default 'pending'
│                                   -- 'pending' | 'processing' | 'completed' | 'failed'
├── products            JSONB       nullable
│                                   -- [{ name, brand, sku, position: {x,y,w,h}, confidence }]
├── product_count       INTEGER     NOT NULL, default 0  -- denormalized
├── processing_time_ms  INTEGER     nullable  -- how long AI took
├── error_message       TEXT        nullable  -- if failed
├── processed_at        TIMESTAMPTZ nullable
├── created_at          TIMESTAMPTZ NOT NULL, default now()
└── updated_at          TIMESTAMPTZ NOT NULL, default now()

Indexes:
  - (survey_id)
  - (store_id, created_at DESC)
  - (status) WHERE status IN ('pending', 'processing')
```

---

## 7. Form Engine

### `form_definitions`

Versioned survey question form definitions. JSONB stores the full form schema.

```
form_definitions
├── id                  UUID        PK
├── org_id              UUID        NOT NULL, FK → organizations
├── scope_type          TEXT        NOT NULL
│                                   -- 'org_default' | 'store_override'
├── scope_id            UUID        NOT NULL
│                                   -- org_id when scope_type = 'org_default'
│                                   -- store_id when scope_type = 'store_override'
├── lineage_id          UUID        NOT NULL  -- groups all versions of the same logical form
├── version             INTEGER     NOT NULL, default 1  -- auto-incrementing per lineage
├── status              TEXT        NOT NULL, default 'draft'
│                                   -- 'draft' | 'published' | 'archived'
├── definition          JSONB       NOT NULL
│                                   -- { schema_version, title, description, questions: [...], logic: [...] }
│                                   -- see Form Definition JSON Structure in HLD
├── created_by          UUID        nullable, FK → users
├── published_at        TIMESTAMPTZ nullable
├── created_at          TIMESTAMPTZ NOT NULL, default now()
└── updated_at          TIMESTAMPTZ NOT NULL, default now()

Indexes:
  - (org_id, scope_type, scope_id)
  - (lineage_id, version DESC)
  - (lineage_id, status) WHERE status = 'published'

Constraints:
  - UNIQUE (lineage_id, version)
```

### `store_form_assignments`

Per-store form override assignment. If null (no row), the store uses the org default form.

```
store_form_assignments
├── store_id            UUID        PK, FK → stores
├── form_lineage_id     UUID        nullable, FK on lineage_id concept (not a real FK — matches form_definitions.lineage_id)
│                                   -- null = use org default
├── assigned_by         UUID        nullable, FK → users
├── created_at          TIMESTAMPTZ NOT NULL, default now()
└── updated_at          TIMESTAMPTZ NOT NULL, default now()
```

### `survey_question_answers`

Individual question responses. One row per question per survey.

```
survey_question_answers
├── id                  UUID        PK
├── survey_id           UUID        NOT NULL, FK → surveys ON DELETE CASCADE
├── form_definition_id  UUID        NOT NULL, FK → form_definitions
│                                   -- exact version of the form used
├── question_id         TEXT        NOT NULL  -- matches question.id in form definition JSON
├── question_type       TEXT        NOT NULL  -- denormalized: 'yes_no' | 'mcq' | 'rating_scale' | 'short_text'
├── answer_value        JSONB       NOT NULL
│                                   -- yes_no: true/false
│                                   -- mcq: "Option A" or ["Option A", "Option C"]
│                                   -- rating_scale: 4
│                                   -- short_text: "The shelf was disorganized"
├── answered_at         TIMESTAMPTZ NOT NULL, default now()
└── created_at          TIMESTAMPTZ NOT NULL, default now()

Indexes:
  - (survey_id)
  - (survey_id, question_id)

Constraints:
  - UNIQUE (survey_id, question_id)  -- one answer per question per survey
```

---

## 8. Lookups & Reference Data

### `industries`

Dynamic list of industry categories for organizations.

```
industries
├── id                  UUID        PK
├── name                TEXT        NOT NULL, UNIQUE  -- "FMCG", "Grocery", "Pharmacy", "Electronics"
├── display_order       INTEGER     NOT NULL, default 0
├── is_active           BOOLEAN     NOT NULL, default true
├── created_at          TIMESTAMPTZ NOT NULL, default now()
└── updated_at          TIMESTAMPTZ NOT NULL, default now()
```

### `store_categories`

Dynamic list of store type categories.

```
store_categories
├── id                  UUID        PK
├── name                TEXT        NOT NULL, UNIQUE  -- "Grocery", "Sweets", "General Store", "Pharmacy"
├── display_order       INTEGER     NOT NULL, default 0
├── is_active           BOOLEAN     NOT NULL, default true
├── created_at          TIMESTAMPTZ NOT NULL, default now()
└── updated_at          TIMESTAMPTZ NOT NULL, default now()
```

---

## 9. Notifications

In-app notifications stored in PostgreSQL for v1 (DynamoDB in production per HLD). Emails are sent via event system and not stored here.

### `notifications`

```
notifications
├── id                  UUID        PK
├── org_id              UUID        NOT NULL, FK → organizations
├── user_id             UUID        NOT NULL, FK → users  -- recipient
├── type                TEXT        NOT NULL
│                                   -- 'survey_reminder' | 'survey_completed' | 'survey_missed' | 'surveyor_invited'
│                                   -- 'store_manager_assigned' | 'org_approved' | 'org_rejected' | 'general'
├── title               TEXT        NOT NULL
├── body                TEXT        NOT NULL
├── link                TEXT        nullable  -- in-app navigation link
├── is_read             BOOLEAN     NOT NULL, default false
├── metadata            JSONB       nullable  -- additional context (store_id, survey_id, etc.)
├── created_at          TIMESTAMPTZ NOT NULL, default now()
└── expires_at          TIMESTAMPTZ nullable  -- for TTL cleanup

Indexes:
  - (user_id, is_read, created_at DESC)  -- "unread notifications for user, newest first"
  - (user_id, created_at DESC)
  - (org_id, created_at DESC)
```

---

## 10. Entity Relationship Diagram

```
organizations ─────┬──────────────────────────────────────────────────────┐
  │                │                                                      │
  │ 1:N            │ 1:N                                                  │ 1:N
  ▼                ▼                                                      ▼
zones            users                                          schedule_templates
  │                │                                                      │
  │ 1:N            ├── user_module_permissions (1:N)                      │ 1:N
  ▼                ├── user_data_scopes (1:N)                             ▼
stores             ├── user_capabilities (1:N)                  recurrence_rules
  │                │                                                      │
  ├── tours (1:N)  │                                                      │ 1:N
  │    ├── scenes  │                                                      ▼
  │    └── shelves │                                              time_windows
  │                │                                                      │
  ├── store_surveyors (N:M with users)                                    │
  │                │                                                      │
  ├── store_form_assignments (1:1)                                        │
  │                │                                                      ▼
  │                │                                           surveyor_assignments
  │                │                                                      │
  │                │                                                      │
  ├───────────────────────────────────────────────────────► schedule_instances
  │                │                                              │
  │                │                                              │
  │                ▼                                              ▼
  ├────────────► surveys ◄────────────────────────────────────────┘
  │                │
  │                ├── survey_scenes (1:N)
  │                ├── survey_photos (1:N)
  │                │      └── survey_ai_results (1:1)
  │                └── survey_question_answers (1:N)
  │
  │
  └── form_definitions (via org_id)

role_templates
  ├── role_template_modules (1:N)
  └── role_template_capabilities (1:N)

industries (lookup)
store_categories (lookup)
notifications (per user)
```

---

## 11. Indexes & Performance

### Hot Query Patterns → Index Design

| Query Pattern | Table | Index |
|---------------|-------|-------|
| "Today's slots for a store" | `schedule_instances` | `(store_id, scheduled_date)` |
| "My upcoming survey slots" | `schedule_instances` | `(assigned_surveyor_id, scheduled_date) WHERE status IN ('pending','in_progress')` |
| "All pending/in-progress slots org-wide" | `schedule_instances` | `(org_id, scheduled_date, status)` |
| "Surveys for a store, newest first" | `surveys` | `(store_id, created_at DESC)` |
| "Active tour for a store" | `tours` | `(store_id, status) WHERE status = 'active'` |
| "User's access map" | `user_module_permissions` + `user_data_scopes` + `user_capabilities` | `(user_id)` on all three |
| "Stores in a zone" | `stores` | `(org_id, zone_id)` |
| "Unread notifications" | `notifications` | `(user_id, is_read, created_at DESC)` |
| "Org's stores by status" | `stores` | `(org_id, status)` |
| "Published form for org/store" | `form_definitions` | `(lineage_id, status) WHERE status = 'published'` |
| "Photos pending AI" | `survey_photos` | `(ai_status) WHERE ai_status IN ('pending','processing')` |

### Composite Indexes (All include `org_id` as leading column where applicable)

Most queries in a multi-tenant system will filter by `org_id` first. Composite indexes lead with `org_id` to maximize efficiency:

- `stores(org_id, status)`
- `stores(org_id, zone_id)`
- `users(org_id, role_template)`
- `schedule_instances(org_id, scheduled_date)`
- `surveys(org_id, created_at DESC)`

---

## 12. Partitioning Strategy

| Table | Partition Key | Strategy | Reason |
|-------|--------------|----------|--------|
| `schedule_instances` | `scheduled_date` | RANGE (monthly) | Fastest-growing table. All queries filter by date range. Old partitions can be archived. |
| `surveys` | `created_at` | RANGE (monthly) | Grows with every survey. Historical queries always have date bounds. |
| `survey_photos` | `created_at` | RANGE (monthly) | Grows with surveys. Same access pattern. |

Partition naming: `{table}_YYYY_MM` (e.g., `schedule_instances_2026_04`)

Partitions created 3 months ahead by a maintenance job.

---

## 13. Row-Level Security

RLS policies as a defense-in-depth layer. Applied via `SET app.current_org_id = :org_id` in the tenant context middleware.

```sql
-- Example RLS policy for stores
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON stores
  USING (org_id = current_setting('app.current_org_id')::uuid);

-- Applied to: organizations, zones, stores, users, schedule_templates,
--             recurrence_rules, schedule_instances, tours, scenes, shelves,
--             surveys, survey_photos, survey_ai_results, form_definitions,
--             survey_question_answers, notifications, store_surveyors,
--             surveyor_assignments
```

---

## Full Table Count Summary

| Category | Tables | Names |
|----------|--------|-------|
| **Org & Geography** | 2 | organizations, zones |
| **Users & Access** | 6 | users, role_templates, role_template_modules, role_template_capabilities, user_module_permissions, user_data_scopes, user_capabilities |
| **Stores** | 2 | stores, store_surveyors |
| **Tours** | 3 | tours, scenes, shelves |
| **Schedule** | 5 | schedule_templates, recurrence_rules, time_windows, surveyor_assignments, schedule_instances |
| **Surveys** | 4 | surveys, survey_scenes, survey_photos, survey_ai_results |
| **Forms** | 3 | form_definitions, store_form_assignments, survey_question_answers |
| **Lookups** | 2 | industries, store_categories |
| **Notifications** | 1 | notifications |
| **Total** | **28** | |

---

## What Lives in SSO (NOT in 360's DB)

For reference — these tables exist in the SSO database and are NOT duplicated:

| Table | Purpose |
|-------|---------|
| `users` (SSO) | Identity: email, password hash, email_verified, name |
| `refresh_tokens` | Token management and revocation |
| `auth_codes` | OAuth authorization code exchange |
| `client_apps` | Registered OAuth clients (shelf360 is one) |
| `email_verification_codes` | Email OTP verification |
| `password_reset_tokens` | Password reset flow |
| `login_attempts` | Rate limiting |
| `audit_logs` (SSO) | SSO-level audit trail |

**Boundary:** SSO owns identity and authentication. 360 owns authorization, org membership, and all business data. The link is `users.sso_user_id` in 360 → `users.id` in SSO (logical foreign key, not physical — different databases).
