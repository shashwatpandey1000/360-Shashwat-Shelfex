# ShelfEx 360 — High-Level Design (HLD)

> **Version:** 1.0
> **Tech Stack:** Next.js (Frontend) · Node.js + Express (Backend) · PostgreSQL · Redis · AWS
> **Architecture Pattern:** Modular Monolith + Targeted Microservices

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Service Decomposition Strategy](#3-service-decomposition-strategy)
4. [Frontend Architecture (Next.js)](#4-frontend-architecture-nextjs)
5. [Backend Architecture (Node.js + Express)](#5-backend-architecture-nodejs--express)
6. [Extracted Microservices](#6-extracted-microservices)
7. [Access Control System](#7-access-control-system)
8. [Schedule Engine](#8-schedule-engine)
9. [Survey Form Engine](#9-survey-form-engine)
10. [Data Architecture](#10-data-architecture)
11. [Inter-Service Communication](#11-inter-service-communication)
12. [AWS Infrastructure](#12-aws-infrastructure)
13. [Subdomain & Routing Architecture](#13-subdomain--routing-architecture)
14. [Globalization Architecture](#14-globalization-architecture)
15. [Security Architecture](#15-security-architecture)
16. [External Integrations](#16-external-integrations)
17. [Caching Strategy](#17-caching-strategy)
18. [Observability & Monitoring](#18-observability--monitoring)
19. [Scalability Considerations](#19-scalability-considerations)

---

## 1. Executive Summary

ShelfEx 360 is a multi-tenant SaaS platform for retail store survey management. Organizations onboard stores, schedule recurring 360° photo surveys, manage surveyors, and consume AI-powered product detection results — all through a role-agnostic, access-map-driven dashboard.

### Core Design Principles

| Principle | Description |
|-----------|-------------|
| **Modular Monolith First** | Core business logic lives in a single deployable unit with strict internal module boundaries. Microservices are extracted only for genuinely independent, async workloads. |
| **Access-Map Driven** | The entire platform is governed by per-user access maps, not hardcoded roles. Roles are templates that generate access maps. The same map drives frontend rendering and backend enforcement. |
| **Global-Ready from Day 1** | No hardcoded locale assumptions. Timezone-aware scheduling, externalized strings, flexible address formats, per-org currency. |
| **Event-Driven Side Effects** | Core operations are synchronous; side effects (notifications, activity logs, AI processing) are asynchronous via events. |
| **Schedule as a First-Class Domain** | The schedule engine is a fully modular subsystem with template → instance generation → execution tracking layers. |

### Deployment Summary

```
┌──────────────────────────────────────────────────────────────────────┐
│                         AWS Cloud                                    │
│                                                                      │
│  ┌──────────────┐    ┌──────────────────────────────────────────┐    │
│  │  CloudFront  │───▶│  Application Load Balancer               │    │
│  │  (CDN)       │    │                                          │    │
│  └──────────────┘    │  ┌──────────────┐  ┌──────────────────┐  │    │
│                      │  │  Next.js App │  │  Express API     │  │    │
│                      │  │ (ECS Fargate)│  │  (ECS Fargate)   │  │    │
│                      │  └──────────────┘  └──────────────────┘  │    │
│                      └──────────────────────────────────────────┘    │
│                                  │                                    │
│          ┌───────────────────────┼───────────────────────┐           │
│          ▼                       ▼                       ▼           │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐   │
│  │  PostgreSQL  │    │  Redis           │    │  S3              │   │
│  │  (RDS)       │    │  (ElastiCache)   │    │  (Media Storage) │   │
│  └──────────────┘    └──────────────────┘    └──────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  Extracted Services (Lambda)                                 │    │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌───────────┐ │    │
│  │  │Notification│ │Activity Log│ │Media Proc. │ │Scheduled  │ │    │
│  │  │Service     │ │Service     │ │Service     │ │Jobs       │ │    │
│  │  └────────────┘ └────────────┘ └────────────┘ └───────────┘ │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  Event Infrastructure                                        │    │
│  │  ┌─────┐  ┌─────┐  ┌────────────────────┐                   │    │
│  │  │ SNS │  │ SQS │  │ EventBridge Sched. │                   │    │
│  │  └─────┘  └─────┘  └────────────────────┘                   │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. System Architecture Overview

### Logical Architecture

The system is composed of a **modular monolith** (the core platform) and **four extracted microservices** for genuinely independent workloads.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        MODULAR MONOLITH                                  │
│                  (Single ECS Fargate Deployment)                         │
│                                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │   Auth &     │  │  Org & Store │  │  Schedule    │  │  Survey     │ │
│  │   Access     │  │  Management  │  │  Engine      │  │  Workflow   │ │
│  │   Module     │  │  Module      │  │  Module      │  │  Module     │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘ │
│         │                 │                  │                  │        │
│  ┌──────┴─────────────────┴──────────────────┴──────────────────┴──────┐ │
│  │                    Internal Event Bus                               │ │
│  │         (In-process EventEmitter + SNS Publisher)                   │ │
│  └──────┬─────────────────┬──────────────────┬──────────────────┬─────┘ │
│         │                 │                  │                  │        │
│  ┌──────┴───────┐  ┌─────┴────────┐  ┌─────┴────────┐  ┌─────┴──────┐ │
│  │  Form Engine │  │  Tour        │  │  Employee    │  │  Dashboard │ │
│  │  Sub-module  │  │  Management  │  │  Management  │  │  API       │ │
│  │              │  │  Sub-module  │  │  Sub-module  │  │  Sub-module│ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
         │ publishes events to
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      SNS Topic: "shelfex-events"                         │
│                                                                         │
│   Fan-out to SQS queues per consumer                                    │
└──────┬──────────────┬──────────────────┬───────────────────┬────────────┘
       ▼              ▼                  ▼                   ▼
┌────────────┐ ┌────────────┐  ┌──────────────────┐  ┌─────────────────┐
│Notification│ │Activity Log│  │Media Processing  │  │AI Pipeline      │
│Service     │ │Service     │  │Service           │  │Orchestrator     │
│(Lambda)    │ │(Lambda)    │  │(Lambda)          │  │(Lambda)         │
└────────────┘ └────────────┘  └──────────────────┘  └─────────────────┘
```

### Request Flow (Typical)

```
User Browser
    │
    ▼
CloudFront (CDN — static assets, Next.js ISR pages)
    │
    ▼
ALB (Application Load Balancer)
    │
    ├── Host: manage.shelfex360.com ──▶ Next.js App (ECS Fargate)
    │                                       │
    │                                       │ Server Components call
    │                                       ▼
    │                                   Express API (ECS Fargate, internal ALB)
    │                                       │
    │                                       ├── Auth middleware (JWT verify + access map check)
    │                                       ├── Business logic (module service layer)
    │                                       ├── Data scope filtering (query-level)
    │                                       ├── Database query (PostgreSQL via RDS)
    │                                       └── Event emission (SNS for side effects)
    │
    ├── Host: shelfex360.com/{slug} ──▶ Next.js App (same deployment, public routes)
    │
    └── Host: admin.shelfex360.com ──▶ Next.js App (same deployment, admin routes) [deferred]
```

---

## 3. Service Decomposition Strategy

### Decision Framework

A component is extracted as a microservice only when ALL of these are true:
1. **No synchronous data dependency** — it doesn't need to join against core tables to function
2. **Different failure domain** — its failure should not cascade to the core platform
3. **Async by nature** — it responds to events, not user-facing requests

### What Stays in the Monolith vs. What Gets Extracted

| Component | Decision | Rationale |
|-----------|----------|-----------|
| **Auth & Access Module** | **MONOLITH** (authentication delegated to Shelfex SSO) | Authentication (login, register, tokens) handled by external SSO via OAuth 2.0. Access maps and authorization enforced in the monolith synchronously — every request depends on it. |
| **Org & Store Management** | **MONOLITH** | Core CRUD, heavily joined with users, zones, schedules. No independent scaling need. |
| **Schedule Engine** | **MONOLITH** (as a module) | Deeply coupled to store data, org data, and surveyor assignments. Needs sync access to resolve "which store, which surveyor, which timezone." |
| **Survey Workflow + Form Engine** | **MONOLITH** | Tightly coupled to schedule slots, store data, and form definitions. No independent scaling need for CRUD operations. |
| **Employee Management** | **MONOLITH** | Shares the user table, access map system, and org hierarchy. |
| **Dashboard API** | **MONOLITH** | Aggregates data from all modules — extracting it would require calling every other service. |
| **Tour Management** | **MONOLITH** | Lightweight CRUD, consumed from the 360 Capture App's output. |
| **Notification Service** | **EXTRACT (Lambda)** | Purely event-driven. No sync dependency. Different failure domain (SES rate limits shouldn't block API responses). Different scaling profile (bursty). |
| **Activity Log Service** | **EXTRACT (Lambda)** | Append-only writes. Never queried synchronously during business operations. High-write, can queue up during failures without user impact. |
| **Media Processing Service** | **EXTRACT (Lambda)** | S3-triggered. No synchronous coupling — monolith generates presigned URLs, Lambda processes uploads. CPU-intensive (thumbnails, validation). |
| **Scheduled Jobs** | **EXTRACT (Lambda)** | Time-triggered via EventBridge. Runs independently: slot materialization, missed survey detection, digest emails, nightly aggregation. |

### Monolith Module Boundaries

The monolith is organized into the following modules, each with strict boundaries. Modules communicate only via their exported public API or the event bus — no direct access to another module's internals.

| Module | Responsibilities | Key Sub-Modules |
|--------|-----------------|-----------------|
| **Auth & Access** | JWT verification (tokens issued by Shelfex SSO), access map materialization, access enforcement middleware, data scope filtering | Access Map Materializer, Scope Filter |
| **Org Management** | Organization CRUD, org settings, org-level survey schedule, org approval workflow | — |
| **Store Management** | Store CRUD, store onboarding, public store pages, CSV bulk import | Tour Management (sub-module) |
| **Employee Management** | User CRUD within org, role template assignment, custom access map builder | — |
| **Schedule Engine** | Schedule templates, recurrence rules, time windows, slot materialization, execution tracking | Template Layer, Instance Generator, Execution Tracker (see Section 8) |
| **Survey Workflow** | Survey CRUD, survey submission, survey status tracking, photo handling | Form Engine (sub-module — see Section 9) |
| **Dashboard API** | Aggregated metrics, activity feed, alerts, compliance data | — |
| **Shared** | Event bus (in-process + SNS publisher), middleware (auth, tenant context, rate limiting, error handling), database connection, common types | — |

**Module dependency rules:**
- Each module exports a typed public API interface. Other modules can only call this interface — never import internal services or repositories directly.
- Dependencies are injected explicitly at app startup and registered in dependency order.
- Enforced via TypeScript path aliases and ESLint boundary rules.

**Module dependency graph:**

```
Auth & Access ← (all modules depend on this)
    │
    ├── Org Management ← Store, Employee, Schedule
    ├── Store Management ← Survey, Schedule
    ├── Schedule Engine ← Survey
    └── Survey Workflow ← Dashboard API
```

---

## 4. Frontend Architecture (Next.js)

### Route Groups

The frontend is organized into two major route groups:

| Route Group | Purpose | Auth Required | Key Pages |
|-------------|---------|---------------|-----------|
| **Public** | Landing, OAuth callback, public store pages (`/{slug}`) | No | Landing, store viewer, SSO auth callback |
| **Dashboard** | All authenticated functionality | Yes (JWT) | Dashboard home, Stores, Surveys, Employees, Schedule, Settings |

### Key UI Areas

| Area | Description |
|------|-------------|
| **Layout (Sidebar + Header)** | Dynamic sidebar renders based on access map. Only modules where the user has any permission appear. |
| **Permissions components** | `<Can permission="stores:write">` (unified permission gate), `usePermission('stores:write')` hook, `useHasAny('stores:*')` for module-level checks — all read from access map context. Single permission system, no separate capability gates. |
| **Form system** | Form renderer (renders from JSON definition), form builder (drag-and-drop for org manager), per-question-type renderers. |
| **Schedule system** | Schedule builder UI, calendar view of materialized slots, surveyor slot assignment. |
| **Panorama viewer** | 360° tour viewer with shelf hotspots, survey photo overlays, AI result overlays. |
| **Providers** | Access map context, i18n, theme — all wrapped at the dashboard layout level. |

### Access-Map-Driven Rendering Flow

```
1. User logs in
   └── User authenticates via Shelfex SSO (OAuth 2.0), tokens set as HTTP-only cookies by 360 server
   └── AccessMap fetched from 360 API /auth/me endpoint after authentication
   └── AccessMap stored in client-side context

2. Dashboard layout
   ├── Reads AccessMap from context provider
   ├── Renders <Sidebar> + <main>
   └── Wraps children in <AccessMapProvider>

3. Sidebar (Client Component)
   ├── Reads AccessMap from context
   └── Renders only modules in accessMap.modules[] (pre-computed from permissions)

4. Page
   ├── Checks access map from context (does user have any permission for this resource?)
   ├── If no access → redirect to /dashboard
   └── Fetches data via API with JWT in Authorization header (API also enforces access map)

5. Action buttons (Client Components)
   ├── <Can permission="stores:write"> wraps Edit button
   ├── <Can permission="employees:manage"> wraps Surveyor panel
   └── Buttons not rendered if no permission → no API call possible
```

### Three Layers of Access Enforcement (Frontend)

| Layer | Where | What It Does | Fail Mode |
|-------|-------|-------------|-----------|
| **Next.js Middleware** | `middleware.ts` | Checks JWT exists in cookie, basic expiry check | Redirect to Shelfex SSO OAuth authorize |
| **Page-Level Check** | Each page component | Reads access map from context, checks `accessMap.modules` includes resource | Redirect if no access |
| **Component-Level Gate** | `<Can permission="...">`, `usePermission()` | Show/hide UI elements (buttons, panels, tabs) | Hidden UI, no API call triggered |

Backend is always the final authority — frontend checks are UX optimizations, not security boundaries.

---

## 5. Backend Architecture (Node.js + Express)

### API Design

All API routes follow this pattern:

```
Request
  │
  ▼
Rate Limiter
  │
  ▼
Auth Middleware ──▶ Verifies SSO-issued JWT (shared signing key), loads accessMap from cache/DB, attaches to request
  │
  ▼
Tenant Context Middleware ──▶ Sets org_id from accessMap (user's org association)
  │
  ▼
Permission Check ──▶ Verifies accessMap.permissions includes required 'resource:action' string
  │
  ▼
Route Handler
  │
  ├── Service Layer (business logic)
  │   ├── Data Scope Filter applied to all queries
  │   ├── Business rules enforced
  │   └── Events emitted for side effects
  │
  ├── Repository Layer (database queries)
  │   └── Scoped by org_id + data scope filter
  │
  └── Response
```

### API Route Groups

| Route Group | Module | Key Endpoints |
|-------------|--------|---------------|
| `/api/auth/*` | Auth | OAuth callback (code exchange), token refresh, logout, get current user — authentication delegated to Shelfex SSO |
| `/api/orgs/*` | Org | CRUD org, org settings, org approval/rejection |
| `/api/stores/*` | Store | CRUD stores, bulk CSV import, store profile, public store data |
| `/api/stores/:id/tour/*` | Tour | Tour CRUD, tour sync from capture app |
| `/api/employees/*` | Employee | CRUD users/employees, assign roles/permissions |
| `/api/schedules/*` | Schedule | CRUD schedule templates, preview slots, per-store overrides |
| `/api/schedules/slots/*` | Schedule | Query slots, slot status updates, surveyor assignment |
| `/api/surveys/*` | Survey | Survey CRUD, submit survey, survey detail, survey photos |
| `/api/forms/*` | Form Engine | CRUD form definitions, question sets, per-store overrides |
| `/api/dashboard/*` | Dashboard | Aggregated metrics, activity feed, alerts |
| `/api/upload/*` | Media | Generate S3 presigned URLs for uploads |

### Data Scope Filtering

Every query that returns org data passes through the scope filter:

```
┌─────────────────────────────────────────────────────────────┐
│                   Data Scope Resolution                      │
│                                                             │
│  accessMap.scope_type = 'org'                               │
│    → WHERE org_id = :org_id                                 │
│    → User sees all stores in the org                        │
│                                                             │
│  accessMap.scope_type = 'zones'                             │
│    → WHERE store_id IN (                                    │
│        SELECT id FROM stores                                │
│        WHERE zone_id IN (:zone_ids)                         │
│      )                                                      │
│    → User sees only stores in their assigned zones          │
│                                                             │
│  accessMap.scope_type = 'stores'                            │
│    → WHERE store_id IN (:store_ids)                         │
│    → User sees only their specifically assigned stores      │
│                                                             │
│  Applied to: stores, surveys, employees, schedule slots,    │
│              activity logs — every entity query              │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Extracted Microservices

### 6.1 Notification Service (Lambda)

**Responsibility:** Deliver all notifications across channels (email, in-app, push).

```
                  ┌─────────────────────────────────────┐
                  │        Notification Service          │
                  │                                     │
SNS Topic ──▶ SQS │  ┌─────────────────────────────┐   │
(filtered)   Queue│  │  Lambda: notification-handler │   │
                  │  │                               │   │
                  │  │  1. Parse event payload        │   │
                  │  │  2. Resolve notification type  │   │
                  │  │  3. Load user preferences      │   │──▶ SES (Email)
                  │  │  4. Load template (i18n-aware) │   │──▶ DynamoDB (In-App)
                  │  │  5. Render template             │   │──▶ FCM/APNs (Push)
                  │  │  6. Fan out per channel         │   │
                  │  │  7. Record delivery status      │   │
                  │  └─────────────────────────────┘   │
                  └─────────────────────────────────────┘
```

**Events consumed:**

| Event | Notification | Channels | Recipient |
|-------|-------------|----------|-----------|
| `org.registered` | Registration confirmation | Email | Org manager |
| `org.registered` | New org for review | Email | Super admins |
| `org.approved` | Org approved | Email | Org manager |
| `org.rejected` | Org rejected | Email | Org manager |
| `store.manager_assigned` | Account created | Email | New store manager |
| `survey.reminder.1hr` | Survey in 1 hour | In-app, Email | Assigned surveyor |
| `survey.reminder.10min` | Survey in 10 minutes | In-app, Email | Assigned surveyor |
| `survey.completed` | Survey completed | In-app, Email (if enabled) | Store manager |
| `survey.missed` | Survey missed | In-app | Store manager |
| `daily.digest` | Daily missed summary | Email | Org manager |
| `weekly.report` | Weekly survey report | Email | Org manager (if enabled) |
| `surveyor.invited` | Surveyor invitation | Email | New surveyor |
| `user.password_reset` | Password reset link | Email | Requesting user |
| `user.otp` | OTP for first-login verify | Email | User |

**Template management:**
- Templates stored in S3 as Handlebars/Mustache files
- One template per notification type per language
- Template variables resolved from event payload + user profile
- Path convention: `templates/{locale}/{notification_type}.hbs`

**In-app notification storage (DynamoDB):**

```
Table: in_app_notifications
  PK: user_id
  SK: created_at#notification_id
  Attributes: type, title, body, link, read, org_id
  TTL: 90 days

GSI: org_id-index (for admin queries)
```

### 6.2 Activity Log Service (Lambda)

**Responsibility:** Record all significant platform actions for audit trail and operational history.

```
SNS Topic ──▶ SQS (FIFO, per-user ordering) ──▶ Lambda: activity-log-writer
                                                       │
                                                       ▼
                                                  DynamoDB
                                                  (append-only)
```

**DynamoDB table design:**

```
Table: activity_logs
  PK: org_id#entity_type       (e.g., "org-123#user", "org-123#store")
  SK: timestamp#event_id
  Attributes: actor_id, actor_name, action, entity_id, entity_name, metadata, ip_address

GSI: actor-index
  PK: actor_id
  SK: timestamp#event_id

GSI: entity-index
  PK: entity_id
  SK: timestamp#event_id
```

**Why DynamoDB, not PostgreSQL:** Activity logs are high-write, append-only, and queried by entity or actor with time-range filters — a perfect fit for DynamoDB's partition key + sort key model. This keeps write-heavy audit data off the main RDS instance.

**Events logged:**

| Event | Action Description |
|-------|-------------------|
| `user.login` | User logged in |
| `user.created` | User account created |
| `user.access_map_changed` | User permissions modified |
| `store.created` | Store created |
| `store.tour_synced` | 360 tour data synced |
| `store.manager_replaced` | Store manager changed |
| `survey.started` | Survey started by surveyor |
| `survey.completed` | Survey submitted |
| `survey.missed` | Survey marked as missed |
| `schedule.template_created` | Schedule template created |
| `schedule.template_updated` | Schedule modified |
| `schedule.slot_assigned` | Surveyor assigned to slot |
| `form.published` | Form definition published |
| `org.settings_updated` | Org settings changed |

### 6.3 Media Processing Service (Lambda)

**Responsibility:** Process uploaded files — validation, thumbnail generation, virus scanning.

```
                    ┌──────────────────────────────────────┐
User uploads        │       Media Processing Pipeline       │
via presigned URL   │                                      │
       │            │  S3 Bucket: shelfex-uploads           │
       ▼            │       │                              │
    S3 PUT ─────────│───────┤                              │
                    │       ▼                              │
                    │  S3 Event Notification               │
                    │       │                              │
                    │       ▼                              │
                    │  Lambda: media-processor              │
                    │       │                              │
                    │       ├── Validate file type/size     │
                    │       ├── Generate thumbnails (sharp) │
                    │       ├── Extract EXIF metadata       │
                    │       ├── Write processed files       │
                    │       │   to S3 (organized paths)     │
                    │       ├── Update DB record with URLs  │
                    │       └── Emit event: media.processed │
                    └──────────────────────────────────────┘
```

**S3 bucket structure:**

```
shelfex-media/
├── orgs/{org_id}/
│   ├── stores/{store_id}/
│   │   ├── tours/{tour_id}/
│   │   │   ├── scenes/{scene_id}/
│   │   │   │   ├── original.jpg
│   │   │   │   ├── thumb_400.jpg
│   │   │   │   └── thumb_200.jpg
│   │   │   └── panorama/
│   │   │       └── tiles/            # Panorama tiles for viewer
│   │   ├── surveys/{survey_id}/
│   │   │   ├── 360/{scene_id}/
│   │   │   │   ├── original.jpg
│   │   │   │   └── thumb_400.jpg
│   │   │   └── shelves/{shelf_id}/
│   │   │       ├── original.jpg
│   │   │       └── thumb_400.jpg
│   │   ├── logo/
│   │   │   ├── original.png
│   │   │   └── thumb_200.png
│   │   └── profile/
│   └── logo/
│       ├── original.png
│       └── thumb_200.png
└── tmp/                              # Upload staging area (lifecycle: 24h TTL)
```

### 6.4 Scheduled Jobs (Lambda + EventBridge Scheduler)

**Responsibility:** Time-triggered background operations.

| Job | Trigger | AWS Service | What It Does |
|-----|---------|-------------|-------------|
| **Slot Materializer** | Daily at 02:00 UTC | EventBridge Scheduler (rate) → Lambda | Evaluates all active schedule templates, generates slots for the next 7–14 days, creates one-time EventBridge schedules for reminders and missed-detection |
| **Survey Reminder (1hr)** | Per-slot, 1hr before window start | EventBridge Scheduler (one-time `at()`) → Lambda → SNS | Sends reminder notification event |
| **Survey Reminder (10min)** | Per-slot, 10min before window start | EventBridge Scheduler (one-time `at()`) → Lambda → SNS | Sends reminder notification event |
| **Missed Survey Detector** | Per-slot, at window end + grace period | EventBridge Scheduler (one-time `at()`) → Lambda | Checks if slot status is still `pending` → marks as `missed` → emits event |
| **Daily Digest** | Daily at 20:00 per org timezone | EventBridge Scheduler → Lambda | Collects missed surveys for the day → sends digest email event |
| **Weekly Report** | Every Monday at 08:00 per org timezone | EventBridge Scheduler → Lambda | Generates weekly survey stats → sends report email event |
| **Nightly Aggregation** | Daily at 03:00 UTC | EventBridge Scheduler → Lambda | Pre-computes dashboard metrics (completion rates, compliance scores) → writes to summary tables |

**Slot Materializer flow:**

```
EventBridge Cron (02:00 UTC daily)
    │
    ▼
Lambda: slot-materializer-fanout
    │
    ├── Query all active schedule_templates
    ├── Group by org_id
    ├── Send batches to SQS (100 templates per message)
    │
    ▼
SQS: slot-materialization-queue
    │
    ▼
Lambda: slot-materializer-worker (concurrency: 50)
    │
    ├── For each template in batch:
    │   ├── Resolve override (entity-level > org-level default)
    │   ├── Evaluate recurrence rules for target date range
    │   ├── For each matching date:
    │   │   ├── For each time window:
    │   │   │   ├── Compute local start/end
    │   │   │   ├── Convert to UTC (DST-aware, using IANA tz database)
    │   │   │   └── Generate slot record with idempotency key
    │   │   └── Batch upsert: INSERT ... ON CONFLICT (idempotency_key) DO NOTHING
    │   └── For each new slot:
    │       ├── Create EventBridge one-time schedule: reminder at start - 1hr
    │       ├── Create EventBridge one-time schedule: reminder at start - 10min
    │       └── Create EventBridge one-time schedule: missed-check at end + grace
    └── Emit metrics to CloudWatch
```

---

## 7. Access Control System

### Core Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ACCESS CONTROL SYSTEM                              │
│                                                                     │
│  ┌──────────────────┐                                               │
│  │  Role Templates   │  Preset permission templates                  │
│  │  (org_manager,    │  (stored in DB, customizable per org)         │
│  │   zone_manager,   │                                               │
│  │   store_manager,  │──generates──▶ Access Map                      │
│  │   surveyor)       │              (per-user JSON)                  │
│  └──────────────────┘                                               │
│                                                                     │
│  ┌──────────────────┐                                               │
│  │  Custom Users     │  Org manager builds custom                    │
│  │  (any combination │──generates──▶ Access Map                      │
│  │   of permissions) │              (per-user JSON)                  │
│  └──────────────────┘                                               │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    ACCESS MAP (materialized JSON)              │   │
│  │                                                               │   │
│  │  {                                                            │   │
│  │    data_scope: { type, zone_ids?, store_ids? },               │   │
│  │    modules: {                                                 │   │
│  │      dashboard:  { read, write, delete, download },           │   │
│  │      stores:     { read, write, delete, download },           │   │
│  │      surveys:    { read, write, delete, download },           │   │
│  │      employees:  { read, write, delete, download },           │   │
│  │      schedule:   { read, write, delete, download },           │   │
│  │      settings:   { read, write, delete, download },           │   │
│  │    },                                                         │   │
│  │    capabilities: {                                            │   │
│  │      survey_execution, employee_management,                   │   │
│  │      schedule_management, store_management                    │   │
│  │    }                                                          │   │
│  │  }                                                            │   │
│  └──────────────────────────────────────────────────────────────┘   │
│         │                              │                             │
│         ▼                              ▼                             │
│  ┌──────────────┐             ┌──────────────────┐                  │
│  │  Frontend     │             │  Backend          │                  │
│  │  Enforcement  │             │  Enforcement      │                  │
│  │               │             │                   │                  │
│  │  • Sidebar    │             │  • API middleware  │                  │
│  │  • Route      │             │  • Module check    │                  │
│  │    guards     │             │  • Capability      │                  │
│  │  • Component  │             │    check           │                  │
│  │    gates      │             │  • Data scope      │                  │
│  │  • Button     │             │    SQL filter      │                  │
│  │    visibility │             │  • Row-level       │                  │
│  └──────────────┘             │    enforcement     │                  │
│                               └──────────────────┘                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Access Map Structure (Full)

```
AccessMap {
  user_id: UUID
  org_id: UUID
  role_template: "org_manager" | "zone_manager" | "store_manager" | "surveyor" | "custom"

  data_scope: {
    type: "org" | "zones" | "stores"
    zone_ids: UUID[]       // populated when type = "zones"
    store_ids: UUID[]      // populated when type = "stores"
  }

  modules: {
    dashboard:  { read: bool, write: bool, delete: bool, download: bool }
    stores:     { read: bool, write: bool, delete: bool, download: bool }
    surveys:    { read: bool, write: bool, delete: bool, download: bool }
    employees:  { read: bool, write: bool, delete: bool, download: bool }
    schedule:   { read: bool, write: bool, delete: bool, download: bool }
    settings:   { read: bool, write: bool, delete: bool, download: bool }
  }

  capabilities: {
    survey_execution: bool
    employee_management: bool
    schedule_management: bool
    store_management: bool
  }
}
```

### Default Role Templates → Access Map Mapping

| Dimension | Org Manager | Zone Manager | Store Manager | Surveyor |
|-----------|------------|-------------|---------------|----------|
| **data_scope.type** | org | zones | stores | stores |
| **dashboard** | rwDd | r--- | r--- | ---- |
| **stores** | rwD- | rw-- | r--- | ---- |
| **surveys** | rwDd | r--d | r--- | ---- |
| **employees** | rw-- | rw-- | rw-- | ---- |
| **schedule** | rw-- | r--- | r--- | ---- |
| **settings** | rw-- | ---- | r--- | ---- |
| **survey_execution** | optional | optional | optional | yes |
| **employee_management** | yes | yes (zone) | yes (store) | no |
| **schedule_management** | yes | no | no | no |
| **store_management** | yes | yes (zone) | no | no |

*(r=read, w=write, D=delete, d=download)*

### Access Hierarchy (Data Visibility)

```
Org Manager (data_scope.type = "org")
  → Sees: all zones, all stores, all surveys, all employees
  │
  └─ Zone Manager (data_scope.type = "zones", zone_ids = [Z1, Z2])
       → Sees: stores in Z1 and Z2, surveys/employees within those stores
       │
       └─ Store Manager (data_scope.type = "stores", store_ids = [S1, S2])
            → Sees: only S1 and S2, surveys/employees within those stores
            │
            └─ Surveyor (data_scope.type = "stores", store_ids = [S1])
                 → Sees: only their own assigned survey slots for S1
```

### Access Map Lifecycle

```
1. CREATE USER
   ├── Org manager picks role template OR builds custom permission set
   ├── System writes to: user_permissions, user_data_scopes tables
   ├── System materializes AccessMap JSON (permissions list + derived modules list)
   └── Caches in Redis: accessmap:{user_id} → AccessMap JSON

2. USER LOGS IN (via Shelfex SSO OAuth 2.0)
   ├── User authenticates on SSO (email + password) — 360 never sees credentials
   ├── SSO issues authorization code → 360 server exchanges for access_token + refresh_token
   ├── JWT contains: user_id, email, emailVerified (issued by SSO, verified by shared signing key)
   ├── 360 server loads AccessMap from Redis (or materializes from DB if cache miss) using user_id
   ├── Tokens stored as HTTP-only cookies on 360's domain
   └── Client fetches: { user, accessMap } from 360 API

3. PERMISSIONS CHANGED (by org manager)
   ├── Update user_permissions table (insert/delete permission strings)
   ├── Re-materialize AccessMap JSON
   ├── Update Redis cache
   ├── Add old access map version to a token blacklist (or rely on short JWT TTL)
   └── User's next token refresh picks up new access map

4. EVERY API REQUEST
   ├── Auth middleware verifies SSO-issued JWT (shared signing key, issuer: accounts.shelfex.com)
   ├── Loads AccessMap from Redis using user_id from JWT claims
   ├── Permission middleware checks accessMap.permissions.includes('resource:action')
   ├── Route handler applies data scope filter to all queries
   └── If denied at any step → 403 Forbidden

5. TOKEN REFRESH
   ├── 360 server sends refresh token to SSO POST /auth/refresh
   ├── SSO validates refresh token, checks user is still active
   ├── SSO issues new access token
   ├── 360 server sets new access_token cookie
   └── 360 server returns updated access map if it has changed since last refresh
```

---

## 8. Schedule Engine

### Three-Layer Architecture

The schedule engine is the most complex module. It is organized into three distinct layers:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          SCHEDULE ENGINE                                 │
│                                                                         │
│  LAYER 1: Template Management (Write Path)                              │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  Handles: CRUD for schedule templates, recurrence rules,          │  │
│  │           time windows, org defaults, per-store overrides         │  │
│  │  Source of truth: schedule_templates + recurrence_rules tables     │  │
│  │  Override resolution: entity-level > org-level default            │  │
│  └───────────────────────────────┬───────────────────────────────────┘  │
│                                  │                                      │
│  LAYER 2: Instance Generation (Materialization)                         │
│  ┌───────────────────────────────┴───────────────────────────────────┐  │
│  │  Handles: Evaluating recurrence rules, computing UTC times,       │  │
│  │           generating concrete slot records, creating EB schedules │  │
│  │  Trigger: Daily batch job (02:00 UTC) + on-demand (template edit) │  │
│  │  Output: schedule_instances (slots) with status = "pending"       │  │
│  │  Key property: Idempotent — safe to re-run for same date range    │  │
│  └───────────────────────────────┬───────────────────────────────────┘  │
│                                  │                                      │
│  LAYER 3: Execution Tracking (State Machine)                            │
│  ┌───────────────────────────────┴───────────────────────────────────┐  │
│  │  Handles: Slot status transitions, surveyor assignment,           │  │
│  │           missed detection, completion recording                  │  │
│  │  Status: pending → in_progress → completed                       │  │
│  │          pending → missed → excused                               │  │
│  │          any → cancelled / skipped                                │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Layer 1: Template Data Model

```
schedule_templates
  ├── id: UUID (PK)
  ├── org_id: UUID (FK → organizations)
  ├── store_id: UUID (FK → stores, nullable)     ← null = org-wide default
  ├── name: TEXT
  ├── timezone: TEXT (IANA)                       ← inherited from store or org
  ├── effective_from: DATE
  ├── effective_until: DATE (nullable)
  ├── is_active: BOOLEAN
  └── created_at, updated_at: TIMESTAMPTZ

recurrence_rules
  ├── id: UUID (PK)
  ├── schedule_template_id: UUID (FK)
  ├── recurrence_type: ENUM
  │     'daily'           → every day
  │     'weekdays'        → Mon–Fri
  │     'specific_days'   → specific days of week
  │     'odd_days'        → odd calendar days
  │     'even_days'       → even calendar days
  │     'interval'        → every N days/weeks
  │     'custom_rrule'    → RFC 5545 RRULE string (future flexibility)
  ├── days_of_week: INT[]                         ← [1,3,5] = Mon/Wed/Fri
  ├── interval_value: INT (nullable)
  ├── interval_unit: ENUM (nullable)              ← 'day', 'week'
  ├── exceptions: JSONB                           ← { skip_dates: ["2026-04-15"] }
  └── time_windows: (1:N relationship below)

time_windows
  ├── id: UUID (PK)
  ├── recurrence_rule_id: UUID (FK)
  ├── window_start: TIME                          ← '08:00' (local time)
  ├── window_end: TIME                            ← '13:00' (local time)
  └── label: TEXT                                 ← 'Morning Window', 'Afternoon Window'
```

### Layer 2: Slot Materialization

```
schedule_instances (materialized slots)
  ├── id: UUID (PK)
  ├── schedule_template_id: UUID (FK)
  ├── recurrence_rule_id: UUID (FK)
  ├── store_id: UUID (FK → stores)
  ├── org_id: UUID (FK → organizations)
  ├── scheduled_date: DATE
  ├── window_start_utc: TIMESTAMPTZ               ← computed from local + tz
  ├── window_end_utc: TIMESTAMPTZ
  ├── window_start_local: TIMESTAMP                ← denormalized for display
  ├── window_end_local: TIMESTAMP
  ├── timezone: TEXT
  ├── status: ENUM
  │     'pending'      → slot generated, not yet started
  │     'in_progress'  → surveyor has started
  │     'completed'    → survey submitted
  │     'missed'       → window ended without completion
  │     'cancelled'    → admin/system cancelled
  │     'skipped'      → holiday/exception
  ├── assigned_surveyor_id: UUID (FK → users, nullable)
  ├── assigned_at: TIMESTAMPTZ
  ├── completed_at: TIMESTAMPTZ (nullable)
  ├── survey_id: UUID (FK → surveys, nullable)    ← linked after completion
  ├── idempotency_key: TEXT (UNIQUE)               ← hash(template, rule, store, date, window_start)
  └── materialized_at: TIMESTAMPTZ

  Partitioned by: scheduled_date (monthly partitions)
  Key indexes:
    - (store_id, scheduled_date)
    - (assigned_surveyor_id, scheduled_date)
    - (status, scheduled_date) WHERE status IN ('pending', 'in_progress')
    - (org_id, scheduled_date)
```

### Layer 3: Slot Status State Machine

```
                ┌──────────┐
                │ PENDING  │
                └──┬───┬───┘
                   │   │
       user starts │   │ window expires (+ grace)
                   │   │
                   ▼   ▼
          ┌─────────┐ ┌────────┐
          │IN_PROG. │ │ MISSED │
          └──┬──────┘ └───┬────┘
             │            │
   user      │            │ admin excuses
   submits   │            │
             ▼            ▼
          ┌─────────┐ ┌────────┐
          │COMPLETED│ │EXCUSED │
          └─────────┘ └────────┘

  From any state except COMPLETED:
    → CANCELLED (admin/system cancels)
    → SKIPPED (holiday/exception rule)
```

### Surveyor Assignment Model

```
Persistent assignment: (store_id, recurrence_rule_id, time_window_id, surveyor_id)
                          │
                          │ applied when slots are materialized
                          ▼
             schedule_instances.assigned_surveyor_id

Override: Store manager can override a specific slot's assignment
          without changing the persistent assignment rule.

Availability check: Before assigning a surveyor to a slot,
                    query for overlapping slots:
                    WHERE assigned_surveyor_id = :surveyor_id
                    AND scheduled_date = :date
                    AND window_start_utc < :proposed_end_utc
                    AND window_end_utc > :proposed_start_utc
                    AND status NOT IN ('cancelled', 'skipped')
                    → If results > 0: conflict, block assignment
```

### Override Resolution

```
When resolving which schedule applies to a store:

1. Check: Does a schedule_template exist with store_id = this store AND is_active = true?
   ├── YES → Use store-specific override
   └── NO  → Use org-wide default (store_id IS NULL, org_id = store's org)

2. When a new store is created:
   └── No store-specific template exists → automatically inherits org default

3. When org manager creates a per-store override:
   └── New template with store_id = that store, effective_from = today
   └── Materializer re-runs for that store, reconciles existing slots
```

### Timezone Handling

```
Rules:
  1. Schedule templates store time windows in LOCAL TIME (e.g., "08:00–13:00")
  2. The timezone comes from the store (or org if store doesn't specify)
  3. Materialization converts local → UTC using the IANA timezone database
  4. All EventBridge triggers use UTC timestamps
  5. Database stores BOTH utc and local columns
  6. Frontend displays local time; backend operates on UTC

DST handling:
  - A "9:00 AM" daily slot in America/New_York is 14:00 UTC in winter, 13:00 UTC in summer
  - This is CORRECT — "9:00 AM local" is the intent, and UTC shifts to maintain it
  - On spring-forward day: a slot at 2:30 AM local doesn't exist → shifted forward
  - On fall-back day: a slot at 1:30 AM local is ambiguous → use first occurrence
```

---

## 9. Survey Form Engine

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SURVEY FORM ENGINE                              │
│                                                                         │
│  ┌─────────────────────────────────┐  ┌──────────────────────────────┐  │
│  │  Question Type Registry         │  │  Form Definition Store       │  │
│  │                                 │  │                              │  │
│  │  Built-in types:                │  │  • Versioned JSON documents  │  │
│  │  ├── yes_no                     │  │  • Org default + per-store   │  │
│  │  ├── mcq (multiple choice)      │  │    overrides                 │  │
│  │  ├── rating_scale               │  │  • Lifecycle: draft →        │  │
│  │  └── short_text                 │  │    published → archived      │  │
│  │                                 │  │                              │  │
│  │  Each type provides:            │  │  Resolution:                 │  │
│  │  ├── config schema (what the    │  │  store override exists?      │  │
│  │  │   builder shows)             │  │  ├── YES → use it            │  │
│  │  ├── answer schema (what shape  │  │  └── NO  → use org default   │  │
│  │  │   the response takes)        │  │                              │  │
│  │  ├── validator function         │  └──────────────────────────────┘  │
│  │  └── default config             │                                    │
│  └─────────────────────────────────┘                                    │
│                                                                         │
│  ┌─────────────────────────────────┐  ┌──────────────────────────────┐  │
│  │  Form Builder UI                │  │  Form Renderer               │  │
│  │  (Org Manager — Settings page)  │  │  (Surveyor — Mobile App)     │  │
│  │                                 │  │                              │  │
│  │  • Drag-and-drop questions      │  │  • Reads form definition     │  │
│  │  • Configure per question type  │  │  • Renders each question     │  │
│  │  • Preview mode                 │  │    using registered renderer │  │
│  │  • Save as draft / publish      │  │  • Validates on submit       │  │
│  │  • Per-store override toggle    │  │  • Returns typed responses   │  │
│  └─────────────────────────────────┘  └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Form Definition JSON Structure

```
{
  "schema_version": "1.0",
  "title": "Store Survey Questions",
  "description": "Default question set for all stores",
  "questions": [
    {
      "id": "q_entrance_clean",
      "type": "yes_no",
      "order": 1,
      "config": {
        "label": "Is the store entrance clean?",
        "required": true
      }
    },
    {
      "id": "q_price_tags",
      "type": "yes_no",
      "order": 2,
      "config": {
        "label": "Are all price tags visible?",
        "required": true
      }
    },
    {
      "id": "q_shelf_org",
      "type": "rating_scale",
      "order": 3,
      "config": {
        "label": "Rate shelf organization",
        "required": true,
        "min": 1,
        "max": 5,
        "labels": { "low": "Poor", "high": "Excellent" }
      }
    },
    {
      "id": "q_issues",
      "type": "mcq",
      "order": 4,
      "config": {
        "label": "Select any issues observed",
        "required": false,
        "options": ["Broken shelves", "Missing products", "Dirty floor", "Poor lighting"],
        "allow_multiple": true,
        "allow_other": true
      }
    }
  ],
  "logic": []
}
```

### Form Definition Data Model

```
form_definitions
  ├── id: UUID (PK)
  ├── org_id: UUID (FK → organizations)
  ├── scope_type: ENUM ('org_default', 'store_override')
  ├── scope_id: UUID                               ← org_id for default, store_id for override
  ├── lineage_id: UUID                              ← groups all versions of the same form
  ├── version: INT                                  ← auto-incrementing per lineage
  ├── status: ENUM ('draft', 'published', 'archived')
  ├── definition: JSONB                             ← the form JSON above
  ├── created_by: UUID (FK → users)
  ├── published_at: TIMESTAMPTZ (nullable)
  └── created_at: TIMESTAMPTZ

store_form_assignments
  ├── store_id: UUID (FK → stores, UNIQUE)
  └── form_lineage_id: UUID (nullable)              ← null = use org default
```

### Versioning Strategy

```
1. Org manager edits form in builder UI
2. On save: update current draft (if no published version with responses)
3. On publish:
   ├── If NO survey responses exist for this lineage → publish in place
   └── If responses EXIST → create new version row (version = prev + 1)
       Old version remains with its answers. New surveys use new version.
4. Survey responses always record the exact form_definition.id (version) they used
```

### Response Storage

```
survey_question_answers
  ├── id: UUID (PK)
  ├── survey_id: UUID (FK → surveys)
  ├── form_definition_id: UUID (FK → form_definitions)  ← exact version
  ├── question_id: TEXT                                   ← matches question.id in JSON
  ├── question_type: TEXT                                 ← denormalized
  ├── answer_value: JSONB                                 ← shape depends on type
  │     yes_no:      true / false
  │     mcq:         "Option A" or ["Option A", "Option C"]
  │     rating:      4
  │     short_text:  "The shelf was disorganized"
  └── answered_at: TIMESTAMPTZ
```

### Adding New Question Types (Extensibility)

To add a new question type (e.g., `photo`, `geo_location`, `number`):

1. Define the `QuestionTypeDefinition` (config schema, answer schema, validator, default config)
2. Create a React renderer component
3. Register in the Question Type Registry
4. It automatically appears in the Form Builder UI and works everywhere

**No database migrations, no API changes, no form engine modifications needed.**

### Conditional Logic (Future-Proofed, Not Built in V1)

The `logic` array in the form definition is reserved for conditional rules:

```
{
  "rule_id": "lr_1",
  "condition": {
    "type": "equals",
    "question_id": "q_entrance_clean",
    "value": false
  },
  "action": {
    "type": "show",
    "target_question_id": "q_entrance_issues"
  }
}
```

Both frontend renderer and backend validator evaluate the same logic rules. The logic engine is a pure function: `(rules, currentAnswers) → visibleQuestions`. Not implemented in V1 but the data model supports it without migration.

---

## 10. Data Architecture

### Database: PostgreSQL (RDS)

Primary database for all transactional data. Multi-tenant via `org_id` on every table.

### Entity Relationship Overview

```
organizations (1)
  │
  ├── zones (N)
  │     └── stores (N)
  │           ├── tours (N)
  │           │     └── scenes (N)
  │           │           └── shelves (N)
  │           ├── surveys (N)
  │           │     ├── survey_photos (N)
  │           │     ├── survey_ai_results (N)
  │           │     └── survey_question_answers (N)
  │           └── store_form_assignments (1)
  │
  ├── users (N)
  │     ├── user_permissions (N, IAM-style 'resource:action' strings)
  │     └── user_data_scopes (N)
  │
  ├── schedule_templates (N)
  │     └── recurrence_rules (N)
  │           └── time_windows (N)
  │
  ├── schedule_instances (N) ← partitioned by scheduled_date
  │
  ├── form_definitions (N) ← versioned per lineage
  │
  └── role_templates (N)
        └── role_template_permissions (N, IAM-style 'resource:action' strings)
```

### Multi-Tenancy Strategy

| Aspect | Approach |
|--------|----------|
| **Isolation model** | Shared database, shared schema, `org_id` column on every table |
| **Query safety** | Tenant context middleware sets `org_id` on every request; all queries filter by it |
| **Defense in depth** | PostgreSQL Row-Level Security (RLS) policies as a secondary check |
| **Index strategy** | All frequently-queried tables have `org_id` as the leading column in composite indexes |
| **Future scaling** | Schema supports per-region database instances if data residency requirements grow |

### Table Partitioning

| Table | Partition Strategy | Reason |
|-------|-------------------|--------|
| `schedule_instances` | Range partition by `scheduled_date` (monthly) | Fastest-growing table; queries always filter by date range |
| `surveys` | Range partition by `created_at` (monthly) | Large table over time; historical queries filter by date |
| `survey_photos` | Range partition by `created_at` (monthly) | Media metadata grows with surveys |
| `activity_logs` | Stored in DynamoDB, not PostgreSQL | Write-heavy, append-only, different access pattern |

### Key Database Tables (Summary)

| Table | Purpose | Key Columns |
|-------|---------|------------|
| `organizations` | Org profiles and settings | id, name, status, country, currency, timezone |
| `zones` | Geographic groupings within org | id, org_id, name, parent_zone_id |
| `stores` | Physical store locations | id, org_id, zone_id, name, slug, status, timezone |
| `users` | All user accounts | id, org_id, email, role_template, scope_type, status |
| `user_permissions` | Per-user IAM-style permissions | user_id, permission (e.g., 'stores:read', 'surveys:execute') |
| `user_data_scopes` | Per-user data visibility scope | user_id, scope_entity_id |
| `schedule_templates` | Schedule definitions | id, org_id, store_id, timezone, is_active |
| `recurrence_rules` | When schedules repeat | id, template_id, recurrence_type, days_of_week |
| `time_windows` | Survey time slots | id, rule_id, window_start, window_end |
| `schedule_instances` | Materialized survey slots | id, store_id, date, status, assigned_surveyor_id |
| `surveyor_assignments` | Persistent slot-to-surveyor mapping | store_id, rule_id, window_id, surveyor_id |
| `tours` | 360 tour data from capture app | id, store_id, status, tour_data (JSONB) |
| `scenes` | Panoramic scenes within a tour | id, tour_id, panorama_url, position |
| `shelves` | Shelf mappings within scenes | id, scene_id, label, coordinates |
| `surveys` | Completed survey records | id, store_id, slot_id, surveyor_id, status |
| `survey_photos` | Photos captured per survey | id, survey_id, shelf_id, photo_url, thumbnail_url |
| `survey_ai_results` | AI detection results per photo | id, photo_id, products (JSONB) |
| `form_definitions` | Versioned form definitions | id, org_id, lineage_id, version, definition (JSONB) |
| `survey_question_answers` | Survey question responses | id, survey_id, form_def_id, question_id, answer (JSONB) |

---

## 11. Inter-Service Communication

### Communication Patterns

| Pattern | Mechanism | Use Case |
|---------|-----------|----------|
| **Frontend → API** | Synchronous HTTP (via ALB) | All user-facing requests |
| **Monolith modules → each other** | In-process function calls (via module public APIs) | Core business logic |
| **Monolith → Lambda services** | Async events (SNS → SQS → Lambda) | Side effects: notifications, logs, media |
| **Time-triggered jobs** | EventBridge Scheduler → Lambda | Slot materialization, reminders, missed detection |
| **Capture App → Platform** | REST API (sync) | Tour data sync, survey submission |
| **Platform → AI Pipeline** | Async events (SNS → SQS → Lambda → external API) | Photo processing |
| **AI Pipeline → Platform** | Webhook / callback API (sync) | Return detection results |

### Event Catalog

```
SNS Topic: "shelfex-events"
│
├── auth.user_first_login      → Activity Log (first OAuth login to 360, user record created in 360 DB)
├── auth.user_login            → Activity Log (SSO-authenticated user session started on 360)
├── auth.access_map_changed    → Activity Log
│
├── org.registered             → Notification (confirmation + admin review)
├── org.approved               → Notification
├── org.rejected               → Notification
├── org.settings_updated       → Activity Log
│
├── store.created              → Notification, Activity Log
├── store.tour_synced          → Notification, Activity Log
├── store.manager_replaced     → Notification, Activity Log
│
├── schedule.template_created  → Activity Log
├── schedule.template_updated  → Activity Log, Slot Materializer (on-demand re-gen)
├── schedule.slot_assigned     → Notification, Activity Log
│
├── survey.reminder_1hr        → Notification
├── survey.reminder_10min      → Notification
├── survey.started             → Activity Log
├── survey.completed           → Notification, Activity Log, AI Pipeline
├── survey.missed              → Notification, Activity Log
│
├── form.published             → Activity Log
│
├── media.uploaded             → Media Processor (via S3 event, not SNS)
├── media.processed            → (updates DB records)
│
└── ai.results_ready           → (updates DB, potentially Notification)
```

### SQS Queue Design

| Queue | Consumer | DLQ | Purpose |
|-------|----------|-----|---------|
| `notification-queue` | Notification Lambda | `notification-dlq` | All notification events |
| `activity-log-queue` | Activity Log Lambda | `activity-log-dlq` | All audit trail events |
| `ai-pipeline-queue` | AI Orchestrator Lambda | `ai-pipeline-dlq` | Survey photo processing |
| `slot-materialization-queue` | Slot Materializer Lambda | `slot-mat-dlq` | Batched template processing |

All queues have:
- Visibility timeout: 5× the Lambda timeout
- Max receive count: 3 (then moves to DLQ)
- Message retention: 14 days (DLQ: 14 days)

---

## 12. AWS Infrastructure

### Service Mapping

| Component | AWS Service | Configuration |
|-----------|-------------|---------------|
| **Next.js App** | ECS Fargate (behind ALB) | 2 tasks, 1 vCPU / 2 GB each |
| **Express API** | ECS Fargate (behind internal ALB) | 2 tasks, 1 vCPU / 2 GB each |
| **PostgreSQL** | RDS (db.r6g.large) | Multi-AZ, automated backups |
| **Redis** | ElastiCache (cache.t3.medium) | Access map cache, general caching |
| **Object Storage** | S3 | Media files, form templates, email templates |
| **CDN** | CloudFront | Static assets, public store pages, media delivery |
| **DNS** | Route 53 | Subdomain routing |
| **SSL** | ACM (Certificate Manager) | Wildcard cert for *.shelfex360.com |
| **Email** | SES (Simple Email Service) | Transactional emails |
| **Event Bus** | SNS + SQS | Inter-service event delivery |
| **Scheduled Triggers** | EventBridge Scheduler | Reminders, missed detection, batch jobs |
| **Serverless Functions** | Lambda | Notification, Activity Log, Media Proc, Jobs |
| **Secrets** | Secrets Manager | DB credentials, API keys, JWT secrets |
| **Monitoring** | CloudWatch | Logs, metrics, alarms |
| **Container Registry** | ECR | Docker images for ECS services |

### Network Architecture

```
┌───────────────────────────────────────────────────────────────────────┐
│                            VPC                                        │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  Public Subnets (2 AZs)                                        │  │
│  │  ┌──────────────┐                                              │  │
│  │  │  ALB (public) │  ← CloudFront → Route 53                    │  │
│  │  └──────┬───────┘                                              │  │
│  └─────────┼───────────────────────────────────────────────────────┘  │
│            │                                                          │
│  ┌─────────┼───────────────────────────────────────────────────────┐  │
│  │  Private Subnets (2 AZs)                                       │  │
│  │         │                                                       │  │
│  │  ┌──────▼────────┐    ┌──────────────────┐                     │  │
│  │  │  ECS Fargate  │    │  ECS Fargate     │                     │  │
│  │  │  (Next.js)    │───▶│  (Express API)   │                     │  │
│  │  └───────────────┘    └────────┬─────────┘                     │  │
│  │                                │                                 │  │
│  │         ┌──────────────────────┼──────────────────────┐         │  │
│  │         ▼                      ▼                      ▼         │  │
│  │  ┌──────────────┐    ┌──────────────────┐    ┌──────────────┐  │  │
│  │  │  RDS          │    │  ElastiCache      │    │  Lambda      │  │  │
│  │  │  (PostgreSQL) │    │  (Redis)          │    │  (Functions) │  │  │
│  │  └──────────────┘    └──────────────────┘    └──────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  NAT Gateway (for Lambda outbound: SES, external AI API)              │
└───────────────────────────────────────────────────────────────────────┘
```

### Deployment Pipeline

```
GitHub (main branch)
    │
    ▼
GitHub Actions CI
    ├── Lint + Type check
    ├── Unit tests
    ├── Build Docker images (Next.js + Express)
    ├── Push to ECR
    ├── Deploy Lambda functions (SAM / CDK)
    └── Deploy ECS services (rolling update)
```

---

## 13. Subdomain & Routing Architecture

### Subdomain Layout

| Subdomain | Purpose | Auth Required | Deployment |
|-----------|---------|---------------|------------|
| `manage.shelfex360.com` | Survey dashboard + org management | Yes | Next.js App (dashboard routes) |
| `admin.shelfex360.com` | Super admin panel (deferred) | Yes | Next.js App (admin routes) |
| `shelfex360.com` | Landing page + public store pages | No | Next.js App (public routes) |
| `api.shelfex360.com` | REST API | Yes (JWT) | Express API (ECS Fargate) |

### Route 53 + ALB Configuration

```
Route 53:
  *.shelfex360.com → CloudFront Distribution
  api.shelfex360.com → Internal ALB (API)

CloudFront:
  Origin 1: ALB (Next.js ECS) ← for HTML/SSR
  Origin 2: S3 (static assets) ← for _next/static, media

ALB Listener Rules:
  Host: manage.shelfex360.com → Target Group: Next.js ECS
  Host: admin.shelfex360.com  → Target Group: Next.js ECS (same app, different routes)
  Host: shelfex360.com        → Target Group: Next.js ECS
  Host: api.shelfex360.com    → Target Group: Express API ECS
```

### Public Store Pages (`shelfex360.com/{slug}`)

- Served by Next.js with ISR (Incremental Static Regeneration)
- Revalidate every 1 hour or on tour update
- No authentication required
- Shows: store name, address, category, logo, 360 tour viewer, operating hours
- Does NOT show: survey data, employee info, schedules, AI results

### Shared Auth Across Subdomains

- Authentication is handled by **Shelfex SSO** (`accounts.shelfex.com`) — not by 360 itself
- SSO maintains an `accounts_session` cookie on its domain for cross-app SSO
- Each subdomain redirects unauthenticated users to SSO's OAuth authorize endpoint
- If the user has an active SSO session, they are silently authenticated (no login prompt)
- Access tokens are stored as HTTP-only cookies on each subdomain's own domain
- Access map determines what the user sees on each subdomain

---

## 14. Globalization Architecture

### i18n Strategy

| Aspect | Approach |
|--------|----------|
| **Framework** | i18next (with react-i18next for Next.js) |
| **String storage** | JSON files per locale: `locales/{lang}/common.json`, `locales/{lang}/dashboard.json` |
| **Launch languages** | English (default), Hindi |
| **User preference** | Stored in user profile, persisted to DB |
| **Fallback chain** | User preference → Browser locale → English |
| **RTL support** | Not built, but not blocked architecturally (CSS logical properties) |
| **Email templates** | Separate template files per locale: `templates/{locale}/{type}.hbs` |
| **Dynamic content** | Not translated (store names, survey questions, etc.) |

### Multi-Currency

- Currency is a **per-org setting** (configured in org profile)
- All monetary values stored as: `{ amount: INTEGER, currency: "INR" }` (amount in smallest unit)
- Display formatting respects locale (₹1,50,000 vs $1,500.00)
- No currency conversion — each org operates in its own currency

### Multi-Timezone

```
Timezone hierarchy:
  Store timezone (primary — all survey windows use this)
    └── Falls back to: Org timezone (if store doesn't set one)

Storage:
  - All timestamps in DB: TIMESTAMPTZ (UTC)
  - Schedule time windows: TIME (local) + IANA timezone string
  - Display: converted to user's relevant timezone (store's tz for survey data)
```

### Multi-Region (Future-Ready)

- DB schema includes `country` on organizations, `region` on stores
- Architecture supports per-region RDS instances if data residency laws require it
- For now: single AWS region deployment (ap-south-1 for India pilot)
- US launch: same deployment, no infrastructure changes needed

---

## 15. Security Architecture

### Authentication — Shelfex SSO (OAuth 2.0)

360 does **not** handle user registration, login, or password management directly. All authentication is delegated to **Shelfex SSO** — a standalone OAuth 2.0 identity provider shared across all Shelfex products (ShelfScan, ShelfMuse, ShelfIntel, Shelf360).

**SSO Infrastructure:**
- **SSO Server** (`accounts.shelfex.com`): Express API — user management, OAuth authorize/token endpoints, session management
- **SSO Frontend** (`accounts.shelfex.com`): Next.js — login, register, password reset UI
- **Database**: Shared PostgreSQL (users, refresh_tokens, auth_codes, client_apps tables)
- **360 is registered as a client app** in the SSO `client_apps` table with its allowed redirect URIs

**OAuth 2.0 Authorization Code Flow:**

```
Login:
  1. User visits 360 → Next.js middleware detects no access_token cookie
  2. Middleware redirects to SSO: GET /oauth/authorize?client_id=shelf360&redirect_uri=...&response_type=code&state=...
  3. SSO checks for accounts_session cookie:
     ├── No session → redirect to SSO login page (user enters email + password on SSO domain)
     └── Valid session → skip login (SSO across apps)
  4. On successful auth, SSO generates authorization code
  5. SSO redirects back to 360: GET /auth/callback?code=...&state=...
  6. 360 server exchanges code with SSO: POST /oauth/token { code, client_id, client_secret, redirect_uri }
  7. SSO returns: { access_token (JWT, 1h), refresh_token (JWT, 30d), id_token }
  8. 360 server sets access_token and refresh_token as HTTP-only cookies on its domain
  9. User lands on /dashboard, authenticated

Token Refresh:
  360 Server → POST SSO /auth/refresh { refreshToken }
    ├── SSO validates refresh token (signature + expiry + DB lookup)
    ├── SSO issues new access token
    └── 360 server sets new access_token cookie

Logout:
  1. 360 client → POST /api/v1/auth/logout (clears 360 domain cookies)
  2. Browser redirect → GET SSO /auth/logout?redirect_uri=... (clears SSO accounts_session cookie)
  3. User lands on SSO login page (fully logged out across all apps)
```

**JWT Token Details:**
- Issuer: `accounts.shelfex.com`
- Audience: `shelfex-services`
- Claims: `{ userId, email, emailVerified }`
- 360 server verifies JWTs using the shared `ACCESS_TOKEN_SECRET` (same signing key as SSO)
- Access map (roles/permissions) will be loaded from 360's own DB after JWT verification

**What SSO handles:** User registration, login, password hashing (bcrypt, 12 rounds), session management, token issuance, token refresh, token revocation, cross-app SSO
**What 360 handles:** Access maps, authorization (permissions), data scope filtering, all business logic

### Security Measures

| Layer | Measure |
|-------|---------|
| **Transport** | HTTPS everywhere (ACM certs, HSTS headers) |
| **Authentication** | Delegated to Shelfex SSO (OAuth 2.0 authorization code flow) |
| **Authorization** | Access map enforcement on every API call, data scope filtering |
| **JWT Access Token** | 1 hour TTL, HTTP-only Secure cookie, verified with shared signing key |
| **Refresh Token** | 30 day TTL, HTTP-only Secure cookie, hash stored in SSO DB for revocation |
| **CSRF** | OAuth state parameter for CSRF protection on auth flow; SameSite cookie policy |
| **Cross-App SSO** | `accounts_session` cookie on SSO domain enables silent auth across Shelfex apps |
| **Rate Limiting** | Per-IP and per-user rate limiting on auth endpoints (SSO-side) |
| **Input Validation** | Zod/Joi schema validation on all API inputs |
| **SQL Injection** | Parameterized queries via Drizzle ORM, no raw SQL |
| **XSS** | React auto-escaping, CSP headers, sanitized user inputs |
| **File Upload** | Presigned URLs (no files through API), file type validation, size limits |
| **Secrets** | Environment variables for JWT signing keys, client secrets; AWS Secrets Manager in production |
| **Audit** | All significant actions logged to Activity Log Service |
| **Password Policy** | Managed by SSO — minimum requirements enforced at registration |

### API Security Headers

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; img-src 'self' *.amazonaws.com; ...
X-Content-Type-Options: nosniff
X-Frame-Options: DENY (except for analytics embed iframe)
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

## 16. External Integrations

### 360 Capture App Integration

```
Capture App (Mobile) ──▶ Platform API

Data flow:
  1. Capture App creates a tour → POST /api/stores/{id}/tour
     Payload: tour metadata, scene list, panorama image URLs (S3), shelf mapping
  2. Platform stores tour data, updates store status: pending_tour → active
  3. Capture App submits a survey → POST /api/surveys
     Payload: 360 capture data, shelf photos (S3 URLs), scene metadata
  4. Platform creates survey record, links to schedule slot, triggers AI pipeline

API Contract (we consume):
  - Tour: { tour_id, store_id, scenes: [{ scene_id, panorama_url, position }], shelves: [{ shelf_id, scene_id, label, coordinates }] }
  - Survey capture: { store_id, slot_id, surveyor_id, 360_data, shelf_photos: [{ shelf_id, photo_url }] }
```

### AI Product Recognition Integration

```
Platform → AI Pipeline:
  1. survey.completed event triggers AI Orchestrator Lambda
  2. Lambda sends shelf photos to AI API:
     POST {AI_API_URL}/detect
     { image_url: "s3://...", store_id, shelf_id, survey_id }
  3. AI API returns (async, via webhook):
     POST /api/ai/results
     { survey_id, shelf_id, products: [{ name, brand, sku, position, confidence }] }
  4. Platform stores results in survey_ai_results table

Graceful degradation:
  - Dashboard shows survey photos immediately (no AI dependency)
  - AI results overlay when available
  - If AI is down: photos still visible, AI column shows "Processing" or "Unavailable"
```

---

## 17. Caching Strategy

| Cache | Store | TTL | Purpose |
|-------|-------|-----|---------|
| **Access Map** | Redis | 15 minutes (matches JWT TTL) | Materialized access maps per user_id |
| **Refresh Tokens** | PostgreSQL | 7 days | Refresh token hashes for revocation |
| **Org settings** | Redis | 1 hour | Org-level config (currency, timezone, language) |
| **Schedule templates** | Redis | 15 minutes | Frequently read during slot queries |
| **Form definitions** | Redis | 30 minutes | Published form definitions (versioned, stable) |
| **Dashboard metrics** | Redis | 5 minutes | Pre-computed aggregated stats |
| **Public store pages** | CloudFront + ISR | 1 hour | Static-ish public pages |
| **Static assets** | CloudFront | 1 year | Next.js build output, images |
| **Role templates** | Redis | 1 hour | Default permission templates |

### Cache Invalidation

- **Access map:** Invalidated immediately on permission change (write-through to Redis)
- **Schedule templates:** Invalidated on template CRUD operations
- **Form definitions:** Invalidated on publish (versioned, so old cache entries are harmless)
- **Dashboard metrics:** Short TTL (5 min), no explicit invalidation
- **Public pages:** Revalidated via Next.js ISR on-demand revalidation API (triggered on tour update)

---

## 18. Observability & Monitoring

### Logging

| Service | Log Destination | Format |
|---------|-----------------|--------|
| Next.js App | CloudWatch Logs | Structured JSON |
| Express API | CloudWatch Logs | Structured JSON |
| Lambda functions | CloudWatch Logs | Structured JSON |
| ALB | S3 (access logs) | Standard ALB format |
| RDS | CloudWatch Logs | PostgreSQL logs |

### Metrics & Alarms

| Metric | Alarm Threshold | Action |
|--------|----------------|--------|
| API response time (p95) | > 2 seconds | Alert to ops |
| API error rate (5xx) | > 1% | Alert to ops |
| RDS CPU utilization | > 80% | Alert + auto-scaling review |
| RDS connections | > 80% of max | Alert |
| Redis memory | > 80% | Alert |
| SQS queue depth | > 1000 messages for > 5 min | Alert (consumer may be stuck) |
| DLQ message count | > 0 | Alert (processing failures) |
| Lambda errors | > 5 in 5 minutes | Alert |
| ECS task health | Any unhealthy | Auto-replace + alert |
| SES bounce rate | > 5% | Alert (email reputation risk) |

### Distributed Tracing

- **X-Ray** integration across ECS (Express API) → Lambda → SQS
- Correlation ID (`x-request-id`) passed through all service boundaries
- Included in all log entries for cross-service debugging

---

## 19. Scalability Considerations

### Current Design Targets

| Metric | Target |
|--------|--------|
| **Organizations** | 100–1,000 |
| **Stores per org** | 1–10,000 |
| **Total stores** | 50,000 |
| **Concurrent users** | 1,000 |
| **Surveys per day** | 100,000 |
| **Schedule slots per day** | 200,000 |

### Scaling Path

| Component | Current | Scaling Trigger | Next Step |
|-----------|---------|----------------|-----------|
| **Express API** | 2 ECS tasks | Response time > 500ms at p95 | Horizontal: add tasks (up to 10) |
| **Next.js** | 2 ECS tasks | SSR response time > 1s | Horizontal: add tasks |
| **PostgreSQL** | Single RDS instance | Read latency > 100ms, or connection saturation | Read replica for dashboard queries |
| **Redis** | Single ElastiCache node | Memory > 80% or connection limits | Clustered ElastiCache |
| **Lambda** | Default concurrency | Throttling observed | Increase reserved concurrency |
| **S3** | Single bucket | N/A (effectively unlimited) | — |
| **SQS** | Standard queues | N/A (effectively unlimited) | — |

### Future Extraction Path

If any monolith module needs independent scaling, the modular architecture makes extraction straightforward:

```
Current: In-process function call → Module public API
Future:  HTTP call → Same public API, deployed as separate ECS service

The module already:
  ├── Has a typed public API interface
  ├── Publishes events via SNS (already external)
  └── Has its own repository layer (database queries isolated)

Extraction steps:
  1. Deploy the module as a separate ECS service
  2. Replace in-process calls with HTTP client calls
  3. Module's own SQS subscription replaces in-process event handlers
  4. No business logic changes needed
```

---

## Architecture Decision Records (Summary)

| Decision | Choice | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| **Primary architecture** | Modular monolith + targeted microservices | Full microservices, pure monolith | Monolith keeps tightly-coupled modules simple; extracted services are genuinely independent async workloads |
| **Frontend framework** | Next.js (App Router) | Remix, Vite SPA | SSR for SEO (public pages), Server Components for access map loading, ISR for store pages |
| **Backend framework** | Express.js | NestJS, Fastify | Lightweight, well-understood, team familiarity; module pattern achieves NestJS-like boundaries without the framework overhead |
| **Database** | PostgreSQL | MongoDB, MySQL | JSONB support for form definitions and access maps, partitioning for time-series data, RLS for defense-in-depth |
| **Activity log store** | DynamoDB | PostgreSQL, Elasticsearch | Append-only, high-write workload; DynamoDB's partition key + sort key model is ideal for entity-based time-range queries |
| **Event bus** | SNS + SQS | EventBridge bus, Kafka, RabbitMQ | Simpler at current scale (~10 event types); EventBridge Scheduler used separately for time-based triggers |
| **Scheduling** | EventBridge Scheduler (one-time `at()`) | Step Functions, custom cron table | Native timezone support, $1/million invocations, built-in retry/DLQ |
| **Auth** | Self-built (JWT + access map) | Auth0, Cognito, Clerk | Permission model is well-defined and custom (access maps); external auth adds latency per request and doesn't solve the authorization problem. JWT allows stateless verification. |
| **File uploads** | S3 presigned URLs + Lambda processing | Multer on API server | No file data through API servers, Lambda scales with upload volume independently |
| **Access control** | IAM-style `resource:action` permissions + data scope hierarchy | Pure RBAC, boolean module grids, external policy engine (OPA/Cerbos) | One unified permission model instead of separate module permissions + capabilities. Infinitely extensible (new permissions = new strings, no migrations). Roles are templates that generate permission sets. Data scope (org/zones/stores) is orthogonal to permissions. |

---

*This document covers High-Level Design only. Low-Level Design (LLD) — including detailed API contracts, database schema DDL, component-level specifications, and implementation details — will be created separately.*
