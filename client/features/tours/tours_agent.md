# Tours Feature

## 1. Overview
API client layer for 360° virtual tour management. No dedicated tour pages exist in this
dashboard yet — tours are accessed from the store detail view. This feature holds the API
functions and types for when tour UI is built out.

## 2. File Map
| File | Responsibility |
|------|---------------|
| api.ts | Axios calls for tour CRUD, scene management, shelf markers |
| types.ts | Local UI types (API types in api.ts) |
| index.ts | Public exports |

## 3. Public Contract
**Exports:** `toursApi`, `Tour`, `TourScene`, `TourShelf` types

## 4. Core Rules & Edge Cases
- One tour per store (enforced server-side)
- Tour data is synced from an external 360° capture pipeline via `PUT /tours/:id/sync`
- UI components for tour browsing will live here when built (currently in store detail tab if any)
