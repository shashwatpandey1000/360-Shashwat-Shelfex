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
- Tour sync is an idempotent upsert — safe to call multiple times with the same data
