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

## 4. Core Rules & Edge Cases
- `org` scope sees all stores; `zones` scope sees stores in assigned zones; `stores` scope sees only assigned stores
- Bulk import validates CSV rows and returns per-row errors without failing the whole batch
- `lat`/`lng` are optional; Google Maps is used for address → coordinates on the client side
- `storeCategory` is a foreign key to `lookups.store_categories` — validate on create
