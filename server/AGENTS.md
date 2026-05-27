# Server — Agent Navigation Guide

## This codebase is modular. Do not scan the whole tree.

Each domain module owns its own agent reference doc. **Start there** before reading any source files.

## Module Index

| Module | Agent doc | API prefix |
|--------|-----------|------------|
| auth | `src/modules/auth/auth_agent.md` | `/api/v1/auth` |
| org | `src/modules/org/org_agent.md` | `/api/v1/orgs` |
| employee | `src/modules/employee/employee_agent.md` | `/api/v1/employees` |
| store | `src/modules/store/store_agent.md` | `/api/v1/stores` |
| zone | `src/modules/zone/zone_agent.md` | `/api/v1/zones` |
| schedule | `src/modules/schedule/schedule_agent.md` | `/api/v1/schedules` |
| survey | `src/modules/survey/survey_agent.md` | `/api/v1/surveys` |
| tour | `src/modules/tour/tour_agent.md` | `/api/v1/tours` |
| lookups | `src/modules/lookups/lookups_agent.md` | `/api/v1/lookups` |
| admin | `src/modules/admin/admin_agent.md` | `/api/v1/admin` |
| health | `src/modules/health/` | `/api/v1/health` |

## How to navigate

1. Identify which module the task touches.
2. Read that module's `*_agent.md` — it describes files, routes, service functions, and edge cases.
3. Open only the specific files you need from that module.
4. Shared infrastructure lives in `src/shared/` (middlewares, db, utils) — read those only if the task crosses module boundaries.

## Shared infrastructure

| Path | What it is |
|------|------------|
| `src/shared/db/` | Drizzle ORM instance + all schema files |
| `src/shared/middlewares/` | auth, tenant, permission, validate, error, rateLimiter |
| `src/shared/utils/ApiResponse.ts` | Standardised response builder |
| `src/shared/utils/asyncHandler.ts` | Wraps async controllers for Express error propagation |

## Request pipeline (every authenticated route)

```
Route → authMiddleware → tenantContext → requirePermission() → validate(zodSchema) → controller → service
```

## Key conventions

- Controllers are thin: parse input, call one service function, return `ApiResponse.*`
- Services own all business logic and DB access via Drizzle
- All routes live under `/api/v1` — see `src/app.ts` for the mount points
- Zod schemas live in `<module>.types.ts`; route-level validation uses `validate()` middleware
