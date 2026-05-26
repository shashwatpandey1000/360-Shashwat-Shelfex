# Server Modular Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize `server/src/` from flat `routes/ + controllers/ + services/ + validations/` directories into isolated `modules/[domain]/` folders, each self-contained with its own routes, controller, service, types, index, and `_agent.md` spec doc. Cross-cutting utilities move to `shared/`.

**Architecture:** Services call Drizzle directly (no repository layer). Each module exports only its Express router via `index.ts`. Cross-module service calls import via the target module's `index.ts`. The flat `routes/`, `controllers/`, `services/`, `validations/` directories are deleted after all modules are established.

**Tech Stack:** Node.js, TypeScript, Express 5, Drizzle ORM, Neon PostgreSQL, Zod

---

## Import Transformation Rules

These rules apply to every file moved into `modules/[m]/`. Reference this table in all module tasks.

| Old import (from `routes/`, `controllers/`, `services/`) | New import (from `modules/[m]/`) |
|---|---|
| `'../db'` | `'../../shared/db'` |
| `'../db/schema'` | `'../../shared/db/schema'` |
| `'../utils/ApiResponse'` | `'../../shared/utils/ApiResponse'` |
| `'../utils/asyncHandler'` | `'../../shared/utils/asyncHandler'` |
| `'../utils/logger'` | `'../../shared/utils/logger'` |
| `'../utils/permissions'` | `'../../shared/utils/permissions'` |
| `'../middlewares/auth.middleware'` | `'../../shared/middlewares/auth.middleware'` |
| `'../middlewares/tenant.middleware'` | `'../../shared/middlewares/tenant.middleware'` |
| `'../middlewares/permission.middleware'` | `'../../shared/middlewares/permission.middleware'` |
| `'../middlewares/validate.middleware'` | `'../../shared/middlewares/validate.middleware'` |
| `'../middlewares/superAdmin.middleware'` | `'../../shared/middlewares/superAdmin.middleware'` |
| `'../middlewares/error.middleware'` | `'../../shared/middlewares/error.middleware'` |
| `'../middlewares/rateLimiter.middleware'` | `'../../shared/middlewares/rateLimiter.middleware'` |
| `'../services/email.service'` | `'../../shared/services/email.service'` |
| `'../services/accessMap.service'` | `'../../shared/services/accessMap.service'` |
| `'../validations/[m].validation'` | `'./[m].types'` (sibling) |
| `'../services/[m].service'` | `'./[m].service'` (sibling) |
| `'../controllers/[m].controller'` | `'./[m].controller'` (sibling) |
| `'../services/org.service'` | `'../org'` (cross-module via org's index) |

---

## Task 1: Create shared/ structure

**Files:**
- Create dir: `server/src/shared/db/schema/`
- Create dir: `server/src/shared/middlewares/`
- Create dir: `server/src/shared/utils/`
- Create dir: `server/src/shared/services/`
- Create dir: `server/src/shared/jobs/`
- Modify: `server/src/app.ts`
- Modify: `server/src/server.ts`
- Modify: `drizzle.config.ts`

- [ ] **Step 1: Move db/ to shared/db/**

```bash
cd server
git mv src/db/index.ts src/shared/db/index.ts
git mv src/db/baseline.ts src/shared/db/baseline.ts
git mv src/db/migrate.ts src/shared/db/migrate.ts
git mv src/db/seed.ts src/shared/db/seed.ts
git mv src/db/schema/index.ts src/shared/db/schema/index.ts
git mv src/db/schema/users.ts src/shared/db/schema/users.ts
git mv src/db/schema/organizations.ts src/shared/db/schema/organizations.ts
git mv src/db/schema/stores.ts src/shared/db/schema/stores.ts
git mv src/db/schema/schedule.ts src/shared/db/schema/schedule.ts
git mv src/db/schema/surveys.ts src/shared/db/schema/surveys.ts
git mv src/db/schema/tours.ts src/shared/db/schema/tours.ts
git mv src/db/schema/forms.ts src/shared/db/schema/forms.ts
git mv src/db/schema/lookups.ts src/shared/db/schema/lookups.ts
git mv src/db/schema/notifications.ts src/shared/db/schema/notifications.ts
```

- [ ] **Step 2: Move middlewares/ to shared/middlewares/**

```bash
git mv src/middlewares/auth.middleware.ts src/shared/middlewares/auth.middleware.ts
git mv src/middlewares/error.middleware.ts src/shared/middlewares/error.middleware.ts
git mv src/middlewares/permission.middleware.ts src/shared/middlewares/permission.middleware.ts
git mv src/middlewares/rateLimiter.middleware.ts src/shared/middlewares/rateLimiter.middleware.ts
git mv src/middlewares/superAdmin.middleware.ts src/shared/middlewares/superAdmin.middleware.ts
git mv src/middlewares/tenant.middleware.ts src/shared/middlewares/tenant.middleware.ts
git mv src/middlewares/validate.middleware.ts src/shared/middlewares/validate.middleware.ts
```

- [ ] **Step 3: Move utils/ to shared/utils/**

```bash
git mv src/utils/ApiResponse.ts src/shared/utils/ApiResponse.ts
git mv src/utils/asyncHandler.ts src/shared/utils/asyncHandler.ts
git mv src/utils/logger.ts src/shared/utils/logger.ts
git mv src/utils/permissions.ts src/shared/utils/permissions.ts
git mv src/utils/validateEnv.ts src/shared/utils/validateEnv.ts
```

- [ ] **Step 4: Move shared services and jobs**

```bash
git mv src/services/email.service.ts src/shared/services/email.service.ts
git mv src/services/accessMap.service.ts src/shared/services/accessMap.service.ts
git mv src/jobs/retryPendingApprovalEmails.ts src/shared/jobs/retryPendingApprovalEmails.ts
```

- [ ] **Step 5: Update `server/src/app.ts` imports**

Replace the top of `app.ts` so the middleware and utility imports point to `shared/`:

```typescript
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { errorMiddleware } from './shared/middlewares/error.middleware';
import { apiLimiter } from './shared/middlewares/rateLimiter.middleware';
import { ApiResponse } from './shared/utils/ApiResponse';
// route imports remain pointing to ./routes/ for now — updated in Task 13
import healthRoutes from './routes/health.route';
import authRoutes from './routes/auth.route';
import lookupsRoutes from './routes/lookups.route';
import orgRoutes from './routes/org.route';
import storeRoutes from './routes/store.route';
import zoneRoutes from './routes/zone.route';
import employeeRoutes from './routes/employee.route';
import adminRoutes from './routes/admin.route';
import scheduleRoutes from './routes/schedule.route';
import tourRoutes from './routes/tour.route';
import surveyRoutes from './routes/survey.route';
```

- [ ] **Step 6: Update `server/src/server.ts` imports**

```typescript
import 'dotenv/config';
import app from './app';
import validateEnv from './shared/utils/validateEnv';
import logger from './shared/utils/logger';
import cron from 'node-cron';
import { materializeAllOrgs, getMaterializationWindow } from './modules/schedule/schedule.materializer';
// note: schedule.materializer import is updated when the schedule module is created in Task 9
// temporarily keep the old path; update to the line above in Task 9
```

- [ ] **Step 7: Update `drizzle.config.ts` schema path**

Open `server/drizzle.config.ts`. Change the schema path:

```typescript
// Before:
schema: './src/db/schema/index.ts',

// After:
schema: './src/shared/db/schema/index.ts',
```

- [ ] **Step 8: Fix any internal imports inside moved files**

The files in `shared/db/`, `shared/middlewares/`, `shared/utils/` may have internal relative imports. Check and fix:

- `shared/middlewares/auth.middleware.ts` — imports from `../db` and `../services/accessMap.service` → update to `../db` → `../db` (already in shared), `../services/accessMap.service` → `../services/accessMap.service` (already in shared — same level)
- `shared/middlewares/permission.middleware.ts` — check for utils imports
- `shared/services/accessMap.service.ts` — imports from `../db/schema` → stays `../db/schema` (sibling in shared)
- `shared/jobs/retryPendingApprovalEmails.ts` — imports from `../db`, `../services/email.service` → `../db`, `../services/email.service` (all siblings in shared)

For each file: open it, find any `../db`, `../utils`, `../services`, `../middlewares` imports, and verify they still resolve correctly given the new location in `shared/`. Since all these items are now co-located in `shared/`, the relative paths `../db`, `../services/email.service`, etc. remain valid from within `shared/middlewares/` or `shared/services/`.

- [ ] **Step 9: Commit the shared/ foundation**

```bash
git add -A
git commit -m "refactor(server): create shared/ structure and move cross-cutting files"
```

---

## Task 2: health module

**Files:**
- Create: `server/src/modules/health/health.routes.ts`
- Create: `server/src/modules/health/health.controller.ts`
- Create: `server/src/modules/health/index.ts`

- [ ] **Step 1: Move health files into module**

```bash
git mv src/routes/health.route.ts src/modules/health/health.routes.ts
git mv src/controllers/health.controller.ts src/modules/health/health.controller.ts
```

- [ ] **Step 2: Update imports in `health.routes.ts`**

Open the file. Apply the transformation rules from Task 1. The route file imports only the controller (sibling) — verify the import reads:

```typescript
import { ... } from './health.controller';
```

- [ ] **Step 3: Update imports in `health.controller.ts`**

Open the file. Find any `../utils/ApiResponse` or similar and update:

```typescript
import { ApiResponse } from '../../shared/utils/ApiResponse';
import { asyncHandler } from '../../shared/utils/asyncHandler';
// (and any other shared imports found in the file)
```

- [ ] **Step 4: Create `server/src/modules/health/index.ts`**

```typescript
export { default as healthRouter } from './health.routes';
```

- [ ] **Step 5: Commit**

```bash
git add src/modules/health/
git commit -m "refactor(server): extract health module"
```

---

## Task 3: auth module

**Files:**
- Create: `server/src/modules/auth/auth_agent.md`
- Create: `server/src/modules/auth/auth.routes.ts`
- Create: `server/src/modules/auth/auth.controller.ts`
- Create: `server/src/modules/auth/auth.types.ts`
- Create: `server/src/modules/auth/index.ts`

- [ ] **Step 1: Move auth files**

```bash
git mv src/routes/auth.route.ts src/modules/auth/auth.routes.ts
git mv src/controllers/auth.controller.ts src/modules/auth/auth.controller.ts
git mv src/validations/auth.validation.ts src/modules/auth/auth.types.ts
```

- [ ] **Step 2: Update imports in `auth.routes.ts`**

Apply transformation rules. Key changes:

```typescript
import { ... } from './auth.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { validate } from '../../shared/middlewares/validate.middleware';
// import any Zod schemas from './auth.types' instead of '../validations/auth.validation'
```

- [ ] **Step 3: Update imports in `auth.controller.ts`**

```typescript
import { ApiResponse } from '../../shared/utils/ApiResponse';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { AccessMap } from '../../shared/services/accessMap.service';
// any validation schema imports → from './auth.types'
// any db imports → from '../../shared/db' and '../../shared/db/schema'
```

- [ ] **Step 4: Create `server/src/modules/auth/index.ts`**

```typescript
export { default as authRouter } from './auth.routes';
```

- [ ] **Step 5: Create `server/src/modules/auth/auth_agent.md`**

```markdown
# Auth Module

## 1. Overview
Handles OAuth 2.0 + PKCE authentication via the external SSO service (`sso-self.vercel.app`).
Manages token exchange, refresh, and logout. Does NOT manage passwords — all authentication
is delegated to the SSO provider. On successful callback, looks up the local 360 user by SSO ID
and builds the `accessMap` (permissions, scope, modules) which is attached to every subsequent request.

## 2. File Map
| File | Responsibility |
|------|---------------|
| auth.routes.ts | Route definitions: POST /callback, POST /refresh, POST /logout, GET /me |
| auth.controller.ts | Parse req, call SSO API or DB, return tokens/user data |
| auth.types.ts | Zod schemas for callback input, refresh input; inferred TS types |
| index.ts | Exports `authRouter` |

## 3. Public Contract
**Server exports:** `authRouter` (mounted at `/api/v1/auth`)

**Routes:**
- `POST /callback` — exchange OAuth code+verifier for tokens; creates/updates local user
- `POST /refresh` — refresh access token via SSO; returns new access token
- `POST /logout` — revoke refresh token
- `GET /me` — return current user profile + accessMap (requires auth)

## 4. Core Rules & Edge Cases
- Token verification uses JWT: issuer `accounts.shelfex.com`, audience `shelfex-services`
- On first SSO login, a local 360 user record is created (looked up by `sso_user_id`)
- `accessMap` is rebuilt on every `/me` call — not cached; always reflects current DB state
- Refresh tokens are stored in httpOnly cookies; access tokens in memory on the client
- If the SSO user has no matching local 360 user, return 403 with `no_local_user`
- `POST /callback` is rate-limited to prevent code replay attacks
```

- [ ] **Step 6: Commit**

```bash
git add src/modules/auth/
git commit -m "refactor(server): extract auth module"
```

---

## Task 4: org module

**Files:**
- Create: `server/src/modules/org/org_agent.md`
- Create: `server/src/modules/org/org.routes.ts`
- Create: `server/src/modules/org/org.controller.ts`
- Create: `server/src/modules/org/org.service.ts`
- Create: `server/src/modules/org/org.types.ts`
- Create: `server/src/modules/org/index.ts`

> **Note:** `org/index.ts` must export service functions needed by other modules (`admin` and `employee` cross-import `org.service`).

- [ ] **Step 1: Move org files**

```bash
git mv src/routes/org.route.ts src/modules/org/org.routes.ts
git mv src/controllers/org.controller.ts src/modules/org/org.controller.ts
git mv src/services/org.service.ts src/modules/org/org.service.ts
git mv src/validations/org.validation.ts src/modules/org/org.types.ts
# settings.validation.ts is also org-related — check if it's a separate file
# if it exists: git mv src/validations/settings.validation.ts and merge into org.types.ts
```

- [ ] **Step 2: Update imports in `org.service.ts`**

```typescript
import { db } from '../../shared/db';
import { ... } from '../../shared/db/schema';
import type { AccessMap } from '../../shared/services/accessMap.service';
import type { CreateOrgInput, UpdateOrgInput } from './org.types';
// remove any import from ../validations/org.validation → ./org.types
```

- [ ] **Step 3: Update imports in `org.controller.ts`**

```typescript
import { ApiResponse } from '../../shared/utils/ApiResponse';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { ... } from './org.types';  // Zod schemas
import { ... } from './org.service';
```

- [ ] **Step 4: Update imports in `org.routes.ts`**

```typescript
import { ... } from './org.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { tenantContext } from '../../shared/middlewares/tenant.middleware';
import { requirePermission } from '../../shared/middlewares/permission.middleware';
import { validate } from '../../shared/middlewares/validate.middleware';
import { ... } from './org.types';  // Zod schemas used in validate()
```

- [ ] **Step 5: Create `server/src/modules/org/index.ts`**

This module exports its router AND service functions consumed by `admin` and `employee` modules:

```typescript
export { default as orgRouter } from './org.routes';
// cross-module consumers (admin.controller, employee.controller) import these:
export { getOrgSettings, getOrgById, listPendingOrgs, approveOrg, rejectOrg } from './org.service';
```

- [ ] **Step 6: Create `server/src/modules/org/org_agent.md`**

```markdown
# Org Module

## 1. Overview
Manages organization lifecycle: registration, admin approval/rejection, and settings management.
Every authenticated request carries an `orgId`; this module owns the organization record that
backs it. Org status controls what features an org can access (`pending`, `active`, `rejected`, `suspended`).

## 2. File Map
| File | Responsibility |
|------|---------------|
| org.routes.ts | Route definitions for org registration, settings, profile |
| org.controller.ts | Parse req, call service, return ApiResponse |
| org.service.ts | Business logic: org creation, approval, settings update, status checks |
| org.types.ts | Zod schemas (CreateOrgInput, UpdateOrgInput, UpdateSettingsInput) and TS types |
| index.ts | Exports `orgRouter` + service functions used cross-module |

## 3. Public Contract
**Server exports:** `orgRouter` (mounted at `/api/v1/orgs`)
**Cross-module service exports:** `getOrgSettings`, `getOrgById`, `listPendingOrgs`, `approveOrg`, `rejectOrg`

**Routes:**
- `POST /orgs` — register a new organization
- `GET /orgs/me` — get current org profile
- `PATCH /orgs/me` — update org settings
- `GET /orgs/me/settings` — get org settings (modules, limits, etc.)

## 4. Core Rules & Edge Cases
- Org status flow: `pending` → (admin approves) → `active` OR (admin rejects) → `rejected`
- Only `active` orgs can access the dashboard; `pending` orgs see the onboarding pending page
- `getOrgSettings` is consumed by `employee.controller` to get org name for invite emails
- `getOrgById`, `listPendingOrgs`, `approveOrg`, `rejectOrg` are consumed by `admin` module
- Org name and industry are set during registration; cannot be changed after approval (enforce in service)
```

- [ ] **Step 7: Commit**

```bash
git add src/modules/org/
git commit -m "refactor(server): extract org module"
```

---

## Task 5: employee module

**Files:**
- Create: `server/src/modules/employee/employee_agent.md`
- Create: `server/src/modules/employee/employee.routes.ts`
- Create: `server/src/modules/employee/employee.controller.ts`
- Create: `server/src/modules/employee/employee.service.ts`
- Create: `server/src/modules/employee/employee.types.ts`
- Create: `server/src/modules/employee/index.ts`

- [ ] **Step 1: Move employee files**

```bash
git mv src/routes/employee.route.ts src/modules/employee/employee.routes.ts
git mv src/controllers/employee.controller.ts src/modules/employee/employee.controller.ts
git mv src/services/employee.service.ts src/modules/employee/employee.service.ts
git mv src/validations/employee.validation.ts src/modules/employee/employee.types.ts
```

- [ ] **Step 2: Update imports in `employee.service.ts`**

```typescript
import { eq, and, or, ilike, desc, asc, count, isNull, inArray, sql } from 'drizzle-orm';
import { db } from '../../shared/db';
import {
  users,
  userPermissions,
  userDataScopes,
  roleTemplates,
  roleTemplatePermissions,
  stores,
} from '../../shared/db/schema';
import { sendEmployeeInviteEmail } from '../../shared/services/email.service';
import type { AccessMap } from '../../shared/services/accessMap.service';
import type {
  CreateEmployeeInput,
  UpdateEmployeeInput,
  ListEmployeesQuery,
} from './employee.types';
import { PERMISSIONS } from '../../shared/utils/permissions';
```

- [ ] **Step 3: Update imports in `employee.controller.ts`**

```typescript
import { Request, Response } from 'express';
import { ApiResponse } from '../../shared/utils/ApiResponse';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { listEmployeesSchema } from './employee.types';
import {
  createEmployee,
  listEmployees,
  getEmployeeById,
  updateEmployee,
  deactivateEmployee,
  reactivateEmployee,
  assignStoreManager,
} from './employee.service';
import { getOrgSettings } from '../org';   // cross-module via org's index.ts
```

- [ ] **Step 4: Update imports in `employee.routes.ts`**

```typescript
import { Router } from 'express';
import { create, list, detail, update, deactivate, reactivate } from './employee.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { tenantContext } from '../../shared/middlewares/tenant.middleware';
import { requirePermission } from '../../shared/middlewares/permission.middleware';
import { validate } from '../../shared/middlewares/validate.middleware';
import { createEmployeeSchema, updateEmployeeSchema } from './employee.types';
```

- [ ] **Step 5: Create `server/src/modules/employee/index.ts`**

```typescript
export { default as employeeRouter } from './employee.routes';
```

- [ ] **Step 6: Create `server/src/modules/employee/employee_agent.md`**

```markdown
# Employee Module

## 1. Overview
Manages the lifecycle of users within an organization: invitation, role assignment, scope control,
and activation/deactivation. "Employees" are users invited by an org manager; they are created
with `sso_user_id=null` and `status=pending_first_login` until they register via SSO.

## 2. File Map
| File | Responsibility |
|------|---------------|
| employee.routes.ts | Route definitions with auth + tenant + permission middleware chain |
| employee.controller.ts | Parse req, call service, return ApiResponse |
| employee.service.ts | Business logic: role hierarchy, scope bounds, DB queries |
| employee.types.ts | Zod schemas (CreateEmployeeInput, UpdateEmployeeInput, ListEmployeesQuery) and TS types |
| index.ts | Exports `employeeRouter` |

## 3. Public Contract
**Server exports:** `employeeRouter` (mounted at `/api/v1/employees`)

**Routes:**
- `POST /employees` — invite a new employee (requires `employees:write`)
- `GET /employees` — list employees with search/filter/pagination (requires `employees:read`)
- `GET /employees/:id` — employee detail with permissions + scopes (requires `employees:read`)
- `PATCH /employees/:id` — update employee (requires `employees:write`)
- `POST /employees/:id/deactivate` — deactivate (requires `employees:delete`)
- `POST /employees/:id/reactivate` — reactivate (requires `employees:delete`)

## 4. Core Rules & Edge Cases
- **Role hierarchy** — `CREATABLE_ROLES` map enforces who can create whom:
  - `org_manager` can create: `org_manager`, `zone_manager`, `store_manager`, `surveyor`
  - `zone_manager` can create: `store_manager`, `surveyor`
  - `store_manager` can create: `surveyor` only
  - `surveyor` cannot create anyone
- **Scope bounds** — store_managers can only assign stores within their own scope; attempts to grant broader scope throw
- **Invitation flow** — `sso_user_id=null`, `status=pending_first_login` until SSO registration
- **Email sending** — invite email is fire-and-forget; failure does not block employee creation
- **Cross-module dep** — `employee.controller` imports `getOrgSettings` from `../org` to pass org name to invite email
```

- [ ] **Step 7: Commit**

```bash
git add src/modules/employee/
git commit -m "refactor(server): extract employee module"
```

---

## Task 6: store module

**Files:**
- Create: `server/src/modules/store/store_agent.md`
- Create: `server/src/modules/store/store.routes.ts`
- Create: `server/src/modules/store/store.controller.ts`
- Create: `server/src/modules/store/store.service.ts`
- Create: `server/src/modules/store/store.types.ts`
- Create: `server/src/modules/store/index.ts`

- [ ] **Step 1: Move store files**

```bash
git mv src/routes/store.route.ts src/modules/store/store.routes.ts
git mv src/controllers/store.controller.ts src/modules/store/store.controller.ts
git mv src/services/store.service.ts src/modules/store/store.service.ts
git mv src/validations/store.validation.ts src/modules/store/store.types.ts
```

- [ ] **Step 2: Update imports in `store.service.ts`**

Open the file. Apply the transformation rules table from Task 1. Key changes:

```typescript
import { db } from '../../shared/db';
import { stores, users, storeCategories, zones, organizations, ... } from '../../shared/db/schema';
import type { AccessMap } from '../../shared/services/accessMap.service';
import type { CreateStoreInput, UpdateStoreInput, ListStoresQuery, CsvRow } from './store.types';
```

- [ ] **Step 3: Update imports in `store.controller.ts` and `store.routes.ts`**

Apply the transformation rules table. All `../utils/` → `../../shared/utils/`, all `../middlewares/` → `../../shared/middlewares/`, all `../validations/store.validation` → `./store.types`, all `../services/store.service` → `./store.service`.

- [ ] **Step 4: Create `server/src/modules/store/index.ts`**

```typescript
export { default as storeRouter } from './store.routes';
```

- [ ] **Step 5: Create `server/src/modules/store/store_agent.md`**

```markdown
# Store Module

## 1. Overview
Manages retail stores within an organization: CRUD operations, geographic data (lat/lng/address),
category assignment, and bulk CSV import. Stores are the primary operational unit that schedule
templates and surveys are attached to. Store lists are scope-filtered based on the caller's
`accessMap.scopeType` and `accessMap.scopeEntityIds`.

## 2. File Map
| File | Responsibility |
|------|---------------|
| store.routes.ts | Route definitions with auth + permission middleware |
| store.controller.ts | Parse req, call service, return ApiResponse |
| store.service.ts | Business logic: CRUD, scope filtering, bulk CSV parse + validate |
| store.types.ts | Zod schemas (CreateStoreInput, UpdateStoreInput, ListStoresQuery, CsvRow) |
| index.ts | Exports `storeRouter` |

## 3. Public Contract
**Server exports:** `storeRouter` (mounted at `/api/v1/stores`)

**Routes:**
- `POST /stores` — create store (requires `stores:write`)
- `GET /stores` — paginated list, scope-filtered (requires `stores:read`)
- `GET /stores/:id` — store detail (requires `stores:read`)
- `PATCH /stores/:id` — update store (requires `stores:write`)
- `DELETE /stores/:id` — delete store (requires `stores:delete`)
- `POST /stores/bulk-import` — CSV import (requires `stores:write`)
- `POST /stores/:id/manager` — assign store manager

## 4. Core Rules & Edge Cases
- `org` scope sees all stores; `zones` scope sees stores in assigned zones; `stores` scope sees only assigned stores
- Bulk import validates CSV rows and returns per-row errors without failing the whole batch
- Deleting a store with active schedule templates should be blocked or cascaded — verify service behavior
- `lat`/`lng` are optional; Google Maps is used for address → coordinates on the client side
- `storeCategory` is a foreign key to `lookups.store_categories` — validate on create
```

- [ ] **Step 6: Commit**

```bash
git add src/modules/store/
git commit -m "refactor(server): extract store module"
```

---

## Task 7: zone module

**Files:**
- Create: `server/src/modules/zone/zone_agent.md`
- Create: `server/src/modules/zone/zone.routes.ts`
- Create: `server/src/modules/zone/zone.controller.ts`
- Create: `server/src/modules/zone/zone.service.ts`
- Create: `server/src/modules/zone/zone.types.ts`
- Create: `server/src/modules/zone/index.ts`

- [ ] **Step 1: Move zone files**

```bash
git mv src/routes/zone.route.ts src/modules/zone/zone.routes.ts
git mv src/controllers/zone.controller.ts src/modules/zone/zone.controller.ts
git mv src/services/zone.service.ts src/modules/zone/zone.service.ts
git mv src/validations/zone.validation.ts src/modules/zone/zone.types.ts
```

- [ ] **Step 2: Update all imports**

Apply the transformation rules table. No known cross-module service dependencies for zone. Standard pattern:

```typescript
// zone.service.ts
import { db } from '../../shared/db';
import { zones, ... } from '../../shared/db/schema';
import type { AccessMap } from '../../shared/services/accessMap.service';
import type { CreateZoneInput, UpdateZoneInput } from './zone.types';
```

- [ ] **Step 3: Create `server/src/modules/zone/index.ts`**

```typescript
export { default as zoneRouter } from './zone.routes';
```

- [ ] **Step 4: Create `server/src/modules/zone/zone_agent.md`**

```markdown
# Zone Module

## 1. Overview
Manages the geographic zone hierarchy within an organization. Zones are intermediate groupings
between an org and its stores (Org → Zones → Stores). Zone managers have data scope limited to
their assigned zones. Zones are used for permission scoping and scheduling hierarchy.

## 2. File Map
| File | Responsibility |
|------|---------------|
| zone.routes.ts | Route definitions |
| zone.controller.ts | Parse req, call service, return ApiResponse |
| zone.service.ts | Zone CRUD, scope-aware queries |
| zone.types.ts | Zod schemas (CreateZoneInput, UpdateZoneInput) |
| index.ts | Exports `zoneRouter` |

## 3. Public Contract
**Server exports:** `zoneRouter` (mounted at `/api/v1/zones`)

**Routes:**
- `POST /zones` — create zone (requires `zones:write`)
- `GET /zones` — list zones for org (requires `zones:read`)
- `GET /zones/:id` — zone detail (requires `zones:read`)
- `PATCH /zones/:id` — update zone (requires `zones:write`)
- `DELETE /zones/:id` — delete zone (requires `zones:delete`)

## 4. Core Rules & Edge Cases
- Zones are always scoped to an org; `orgId` is taken from `req.orgId` not from request body
- Deleting a zone that has stores assigned should warn/block — verify service behavior
- Zone names must be unique within an org
```

- [ ] **Step 5: Commit**

```bash
git add src/modules/zone/
git commit -m "refactor(server): extract zone module"
```

---

## Task 8: lookups module

**Files:**
- Create: `server/src/modules/lookups/lookups_agent.md`
- Create: `server/src/modules/lookups/lookups.routes.ts`
- Create: `server/src/modules/lookups/lookups.controller.ts`
- Create: `server/src/modules/lookups/lookups.types.ts`
- Create: `server/src/modules/lookups/index.ts`

- [ ] **Step 1: Move lookups files**

```bash
git mv src/routes/lookups.route.ts src/modules/lookups/lookups.routes.ts
git mv src/controllers/lookups.controller.ts src/modules/lookups/lookups.controller.ts
# no dedicated lookups.service.ts — controller queries DB directly or uses inline logic
# no lookups.validation.ts — check if one exists; if so: git mv src/validations/lookups.validation.ts src/modules/lookups/lookups.types.ts
```

- [ ] **Step 2: Update imports in moved files**

Apply transformation rules. No service layer for lookups (controller does simple DB reads):

```typescript
// lookups.controller.ts
import { db } from '../../shared/db';
import { industries, storeCategories } from '../../shared/db/schema';
import { ApiResponse } from '../../shared/utils/ApiResponse';
import { asyncHandler } from '../../shared/utils/asyncHandler';
```

- [ ] **Step 3: Create `server/src/modules/lookups/index.ts`**

```typescript
export { default as lookupsRouter } from './lookups.routes';
```

- [ ] **Step 4: Create `server/src/modules/lookups/lookups_agent.md`**

```markdown
# Lookups Module

## 1. Overview
Provides read-only reference data used across the application: industry types and store categories.
This data is seeded once and rarely changes. No write operations are exposed via API.
Client-side components use these for dropdown/select options.

## 2. File Map
| File | Responsibility |
|------|---------------|
| lookups.routes.ts | GET-only route definitions (no auth required for some) |
| lookups.controller.ts | Query lookups tables, return ApiResponse |
| lookups.types.ts | Type definitions for lookup items |
| index.ts | Exports `lookupsRouter` |

## 3. Public Contract
**Server exports:** `lookupsRouter` (mounted at `/api/v1/lookups`)

**Routes:**
- `GET /lookups/industries` — list all industries
- `GET /lookups/store-categories` — list all store categories

## 4. Core Rules & Edge Cases
- No write routes — lookups are seed data managed via `db:seed`
- These endpoints may be called without org context (used during onboarding registration)
- Client should cache these aggressively (they change only with deployments)
```

- [ ] **Step 5: Commit**

```bash
git add src/modules/lookups/
git commit -m "refactor(server): extract lookups module"
```

---

## Task 9: schedule module

**Files:**
- Create: `server/src/modules/schedule/schedule_agent.md`
- Create: `server/src/modules/schedule/schedule.routes.ts`
- Create: `server/src/modules/schedule/schedule.controller.ts`
- Create: `server/src/modules/schedule/schedule.service.ts`
- Create: `server/src/modules/schedule/schedule.materializer.ts`
- Create: `server/src/modules/schedule/schedule.types.ts`
- Create: `server/src/modules/schedule/index.ts`

- [ ] **Step 1: Move schedule files**

```bash
git mv src/routes/schedule.route.ts src/modules/schedule/schedule.routes.ts
git mv src/controllers/schedule.controller.ts src/modules/schedule/schedule.controller.ts
git mv src/services/schedule.service.ts src/modules/schedule/schedule.service.ts
git mv src/services/schedule.materializer.ts src/modules/schedule/schedule.materializer.ts
git mv src/validations/schedule.validation.ts src/modules/schedule/schedule.types.ts
```

- [ ] **Step 2: Update imports in `schedule.service.ts`**

```typescript
import { eq, and, or, desc, asc, count, gte, lt, lte, inArray, notInArray, isNull, sql } from 'drizzle-orm';
import { db } from '../../shared/db';
import {
  scheduleTemplates, recurrenceRules, timeWindows, scheduleInstances, surveyorAssignments, stores, users,
} from '../../shared/db/schema';
import type { AccessMap } from '../../shared/services/accessMap.service';
import type { CreateTemplateInput, UpdateTemplateInput, /* all other inputs */ } from './schedule.types';
```

- [ ] **Step 3: Update imports in `schedule.materializer.ts`**

```typescript
import { db } from '../../shared/db';
import { scheduleTemplates, recurrenceRules, timeWindows, scheduleInstances, /* others */ } from '../../shared/db/schema';
import logger from '../../shared/utils/logger';
// remove any ../db, ../utils imports → apply transformation rules
```

- [ ] **Step 4: Update imports in `schedule.controller.ts` and `schedule.routes.ts`**

Apply transformation rules table. All `../utils/` → `../../shared/utils/`, all `../middlewares/` → `../../shared/middlewares/`, all `../validations/schedule.validation` → `./schedule.types`, service imports → `./schedule.service`.

- [ ] **Step 5: Update `server/src/server.ts` schedule.materializer import**

Now that `schedule.materializer.ts` is in the module:

```typescript
import { materializeAllOrgs, getMaterializationWindow } from './modules/schedule/schedule.materializer';
```

Replace the old path (`./services/schedule.materializer`) with this line.

- [ ] **Step 6: Create `server/src/modules/schedule/index.ts`**

```typescript
export { default as scheduleRouter } from './schedule.routes';
export { materializeAllOrgs, getMaterializationWindow } from './schedule.materializer';
```

- [ ] **Step 7: Create `server/src/modules/schedule/schedule_agent.md`**

```markdown
# Schedule Module

## 1. Overview
Manages the scheduling engine: templates, recurrence rules, time windows, and materialized slots.
This is the most complex module. Templates define WHAT to schedule (which stores, which surveyors);
recurrence rules define WHEN (daily/weekly/monthly patterns); time windows define the TIME of day.
A daily cron job (02:00 UTC) materializes `schedule_instances` rows for the next 14 days.

## 2. File Map
| File | Responsibility |
|------|---------------|
| schedule.routes.ts | Route definitions for templates, rules, windows, slots, assignments |
| schedule.controller.ts | Parse req, call service, return ApiResponse |
| schedule.service.ts | Business logic: template CRUD, slot queries, assignment management |
| schedule.materializer.ts | Slot generation engine — creates schedule_instances from templates + rules |
| schedule.types.ts | Zod schemas for all schedule inputs; inferred TS types |
| index.ts | Exports `scheduleRouter`, `materializeAllOrgs`, `getMaterializationWindow` |

## 3. Public Contract
**Server exports:** `scheduleRouter` (mounted at `/api/v1/schedules`)
**Cross-module exports:** `materializeAllOrgs`, `getMaterializationWindow` (used by `server.ts` cron)

**Key Routes:**
- `POST /schedules/templates` — create template
- `GET /schedules/templates` — list templates for org
- `POST /schedules/templates/:id/rules` — add recurrence rule
- `POST /schedules/templates/:id/rules/:ruleId/windows` — add time window
- `GET /schedules/slots` — list materialized slots with date range filter
- `POST /schedules/slots/:id/assign` — assign surveyor to slot
- `POST /schedules/preview` — preview slots before materializing

## 4. Core Rules & Edge Cases
- `schedule_instances` table is PARTITIONED by date — queries MUST include a date range
- The materializer runs daily at 02:00 UTC and generates 14 days ahead; avoid manual inserts
- Surveyor assignments persist across slot regeneration via `surveyor_assignments` table
- A template can have multiple recurrence rules; a rule can have multiple time windows
- Deactivating a template stops future slot generation but does NOT delete existing slots
- `previewSlots` is a dry-run that returns what would be materialized without writing to DB
```

- [ ] **Step 8: Commit**

```bash
git add src/modules/schedule/ src/server.ts
git commit -m "refactor(server): extract schedule module and update server.ts materializer import"
```

---

## Task 10: survey module

**Files:**
- Create: `server/src/modules/survey/survey_agent.md`
- Create: `server/src/modules/survey/survey.routes.ts`
- Create: `server/src/modules/survey/survey.controller.ts`
- Create: `server/src/modules/survey/survey.service.ts`
- Create: `server/src/modules/survey/survey.types.ts`
- Create: `server/src/modules/survey/index.ts`

- [ ] **Step 1: Move survey files**

```bash
git mv src/routes/survey.route.ts src/modules/survey/survey.routes.ts
git mv src/controllers/survey.controller.ts src/modules/survey/survey.controller.ts
git mv src/services/survey.service.ts src/modules/survey/survey.service.ts
git mv src/validations/survey.validation.ts src/modules/survey/survey.types.ts
```

- [ ] **Step 2: Update all imports**

Apply transformation rules. Key changes in `survey.service.ts`:

```typescript
import { db } from '../../shared/db';
import { surveys, surveyScenes, surveyPhotos, surveyAiResults, /* others */ } from '../../shared/db/schema';
import type { AccessMap } from '../../shared/services/accessMap.service';
import type { CreateSurveyInput, /* others */ } from './survey.types';
```

- [ ] **Step 3: Create `server/src/modules/survey/index.ts`**

```typescript
export { default as surveyRouter } from './survey.routes';
```

- [ ] **Step 4: Create `server/src/modules/survey/survey_agent.md`**

```markdown
# Survey Module

## 1. Overview
Manages survey instances: photo captures at stores, scene organization, and AI result storage.
Surveys are typically created from a scheduled slot (linked to `schedule_instances`) and track
the actual execution of a store visit. Photos are uploaded to S3 and referenced by URL.

## 2. File Map
| File | Responsibility |
|------|---------------|
| survey.routes.ts | Route definitions |
| survey.controller.ts | Parse req, call service, return ApiResponse |
| survey.service.ts | Survey CRUD, photo management, AI result storage |
| survey.types.ts | Zod schemas and TS types |
| index.ts | Exports `surveyRouter` |

## 3. Public Contract
**Server exports:** `surveyRouter` (mounted at `/api/v1/surveys`)

**Routes:**
- `GET /surveys` — paginated survey list (scope-filtered)
- `GET /surveys/:id` — survey detail with scenes + photos
- `POST /surveys/:id/scenes` — add a scene
- `POST /surveys/:id/scenes/:sceneId/photos` — add photo to scene
- `GET /surveys/:id/photos` — list photos

## 4. Core Rules & Edge Cases
- `surveys` table is PARTITIONED by date — always include date range in queries
- `survey_photos` table is also PARTITIONED — same constraint
- Photos reference S3 URLs; use the `/upload` endpoint (not in this module) for presigned URLs
- AI results are written by an external pipeline, not by user actions
- Survey status flow: `pending` → `in_progress` → `completed`
```

- [ ] **Step 5: Commit**

```bash
git add src/modules/survey/
git commit -m "refactor(server): extract survey module"
```

---

## Task 11: tour module

**Files:**
- Create: `server/src/modules/tour/tour_agent.md`
- Create: `server/src/modules/tour/tour.routes.ts`
- Create: `server/src/modules/tour/tour.controller.ts`
- Create: `server/src/modules/tour/tour.service.ts`
- Create: `server/src/modules/tour/tour.types.ts`
- Create: `server/src/modules/tour/index.ts`

- [ ] **Step 1: Move tour files**

```bash
git mv src/routes/tour.route.ts src/modules/tour/tour.routes.ts
git mv src/controllers/tour.controller.ts src/modules/tour/tour.controller.ts
git mv src/services/tour.service.ts src/modules/tour/tour.service.ts
git mv src/validations/tour.validation.ts src/modules/tour/tour.types.ts
```

- [ ] **Step 2: Update all imports**

Apply transformation rules. Key changes in `tour.service.ts`:

```typescript
import { db } from '../../shared/db';
import { tours, scenes, shelves } from '../../shared/db/schema';
import type { CreateTourInput, /* others */ } from './tour.types';
```

- [ ] **Step 3: Create `server/src/modules/tour/index.ts`**

```typescript
export { default as tourRouter } from './tour.routes';
```

- [ ] **Step 4: Create `server/src/modules/tour/tour_agent.md`**

```markdown
# Tour Module

## 1. Overview
Manages 360° panoramic virtual tours for stores. Each store can have one tour; a tour contains
multiple scenes (panoramic images); each scene contains shelf markers (interactive hotspots).
Tour data is synced from an external capture pipeline.

## 2. File Map
| File | Responsibility |
|------|---------------|
| tour.routes.ts | Route definitions |
| tour.controller.ts | Parse req, call service, return ApiResponse |
| tour.service.ts | Tour CRUD, scene and shelf management |
| tour.types.ts | Zod schemas and TS types |
| index.ts | Exports `tourRouter` |

## 3. Public Contract
**Server exports:** `tourRouter` (mounted at `/api/v1/tours`)

**Routes:**
- `GET /tours` — list tours for org
- `GET /tours/:id` — tour detail with scenes and shelves
- `POST /tours` — create tour for a store
- `PUT /tours/:id/sync` — sync tour data from external source
- `POST /tours/:id/scenes` — add scene
- `POST /tours/:id/scenes/:sceneId/shelves` — add shelf marker

## 4. Core Rules & Edge Cases
- One tour per store (enforced at service layer)
- Scene order matters for navigation; the `order` field determines sequence
- Shelf markers include product metadata and a position within the panorama (x, y coordinates)
- Tour sync is an idempotent upsert — safe to call multiple times with the same data
```

- [ ] **Step 5: Commit**

```bash
git add src/modules/tour/
git commit -m "refactor(server): extract tour module"
```

---

## Task 12: admin module

**Files:**
- Create: `server/src/modules/admin/admin_agent.md`
- Create: `server/src/modules/admin/admin.routes.ts`
- Create: `server/src/modules/admin/admin.controller.ts`
- Create: `server/src/modules/admin/admin.types.ts`
- Create: `server/src/modules/admin/index.ts`

- [ ] **Step 1: Move admin files**

```bash
git mv src/routes/admin.route.ts src/modules/admin/admin.routes.ts
git mv src/controllers/admin.controller.ts src/modules/admin/admin.controller.ts
# no dedicated admin.service.ts — admin.controller calls org.service directly
```

- [ ] **Step 2: Update imports in `admin.controller.ts`**

```typescript
import { Request, Response } from 'express';
import { ApiResponse } from '../../shared/utils/ApiResponse';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { listPendingOrgs, approveOrg, rejectOrg, getOrgById } from '../org';  // cross-module via org index
import { sendOrgApprovedEmail, sendOrgRejectedEmail } from '../../shared/services/email.service';
```

- [ ] **Step 3: Update imports in `admin.routes.ts`**

```typescript
import { Router } from 'express';
import { ... } from './admin.controller';
import { superAdminMiddleware } from '../../shared/middlewares/superAdmin.middleware';
// (and any other middleware imports — apply transformation rules)
```

- [ ] **Step 4: Create `server/src/modules/admin/index.ts`**

```typescript
export { default as adminRouter } from './admin.routes';
```

- [ ] **Step 5: Create `server/src/modules/admin/admin_agent.md`**

```markdown
# Admin Module

## 1. Overview
Super-admin operations for platform-level management. Not accessible to org users —
all routes require the `superAdminMiddleware` which verifies a different credential
than the regular JWT auth. Primary use: approving or rejecting new org registrations.

## 2. File Map
| File | Responsibility |
|------|---------------|
| admin.routes.ts | Route definitions, all protected by superAdminMiddleware |
| admin.controller.ts | Parse req, call org service + email service, return ApiResponse |
| admin.types.ts | Type definitions if needed |
| index.ts | Exports `adminRouter` |

## 3. Public Contract
**Server exports:** `adminRouter` (mounted at `/api/v1/admin`)

**Routes:**
- `GET /admin/orgs/pending` — list orgs awaiting approval
- `POST /admin/orgs/:id/approve` — approve org (sends approval email)
- `POST /admin/orgs/:id/reject` — reject org (sends rejection email)
- `GET /admin/orgs/:id` — get any org by ID

## 4. Core Rules & Edge Cases
- All routes protected by `superAdminMiddleware` — NOT the standard JWT authMiddleware
- Super admins are stored in `super_admins` table, not `users` table
- Approval/rejection sends email via `shared/services/email.service`
- Admin module has NO own service — it delegates to `../org` (cross-module import via org's index.ts)
- Cross-module dep: imports `listPendingOrgs`, `approveOrg`, `rejectOrg`, `getOrgById` from `../org`
```

- [ ] **Step 6: Commit**

```bash
git add src/modules/admin/
git commit -m "refactor(server): extract admin module"
```

---

## Task 13: Update app.ts to use modules and delete old directories

**Files:**
- Modify: `server/src/app.ts`
- Delete: `server/src/routes/` (now empty)
- Delete: `server/src/controllers/` (now empty)
- Delete: `server/src/services/` (remaining domain services moved to modules)
- Delete: `server/src/validations/` (all moved to module types files)
- Delete: `server/src/middlewares/` (moved to shared)
- Delete: `server/src/utils/` (moved to shared)
- Delete: `server/src/db/` (moved to shared/db)
- Delete: `server/src/jobs/` (moved to shared/jobs)

- [ ] **Step 1: Rewrite route imports in `app.ts` to use module exports**

Replace all route import lines at the top of `app.ts`:

```typescript
import { healthRouter } from './modules/health';
import { authRouter } from './modules/auth';
import { lookupsRouter } from './modules/lookups';
import { orgRouter } from './modules/org';
import { storeRouter } from './modules/store';
import { zoneRouter } from './modules/zone';
import { employeeRouter } from './modules/employee';
import { adminRouter } from './modules/admin';
import { scheduleRouter } from './modules/schedule';
import { tourRouter } from './modules/tour';
import { surveyRouter } from './modules/survey';
```

- [ ] **Step 2: Update route mounting lines in `app.ts`**

Replace the `apiV1.use(...)` lines:

```typescript
apiV1.use('/health', healthRouter);
apiV1.use('/auth', authRouter);
apiV1.use('/lookups', lookupsRouter);
apiV1.use('/orgs', orgRouter);
apiV1.use('/stores', storeRouter);
apiV1.use('/zones', zoneRouter);
apiV1.use('/employees', employeeRouter);
apiV1.use('/admin', adminRouter);
apiV1.use('/schedules', scheduleRouter);
apiV1.use('/tours', tourRouter);
apiV1.use('/surveys', surveyRouter);
```

- [ ] **Step 3: Run TypeScript check**

```bash
cd server
npx tsc --noEmit
```

Expected: zero errors. If errors appear, they will be import path mismatches — trace each error to the file mentioned and apply the correct transformation from the rules table.

- [ ] **Step 4: Verify the server starts**

```bash
npm run dev
```

Expected: `🚀 Shelf360 API listening on port 4000` with no startup errors. Test `GET http://localhost:4000/api/v1/health` returns `200 OK`.

- [ ] **Step 5: Delete old flat directories**

```bash
# verify these are empty first
ls src/routes src/controllers src/services src/validations src/middlewares src/utils src/jobs
# if empty or all files accounted for in modules/:
git rm -r src/routes src/controllers src/services src/validations src/middlewares src/utils src/jobs src/db
```

> **Before running git rm**: confirm each old directory is empty or contains only files already moved. `src/services/` should still have no remaining domain services (all moved to modules/).

- [ ] **Step 6: Final TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(server): update app.ts to use modules, delete old flat directories

All 11 domain modules now live under src/modules/. Shared cross-cutting code
lives under src/shared/. Route, controller, service, validation files have been
removed from their old flat locations."
```

---

## Self-Review Checklist

- [x] All 11 server domains have a module: health, auth, org, employee, store, zone, schedule, survey, tour, lookups, admin
- [x] `shared/` contains: db/, middlewares/, utils/, services/ (email + accessMap), jobs/
- [x] Cross-module deps: `employee.controller` → `../org`, `admin.controller` → `../org` + `../../shared/services/email.service`
- [x] `schedule.materializer` is in the schedule module and exported; `server.ts` import updated in Task 9
- [x] `drizzle.config.ts` schema path updated in Task 1
- [x] Every module has `_agent.md` with all 4 sections
- [x] `app.ts` migration (import + mount) done in Task 13
- [x] Old directories deleted after TypeScript check passes
