# Lookups Module

## 1. Overview
Provides read-only reference data used across the application: industry types and store categories.
This data is seeded once and rarely changes. No write operations are exposed via API.
Client-side components use these for dropdown/select options.

## 2. File Map
| File | Responsibility |
|------|---------------|
| lookups.routes.ts | GET-only route definitions |
| lookups.controller.ts | Query lookups tables, return ApiResponse |
| lookups.types.ts | Type definitions (minimal — no write schemas) |
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
