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
- Zone names must be unique within an org
