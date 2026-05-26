# Survey Module

## 1. Overview
Manages survey instances: photo captures at stores, scene organization, and AI result storage.
Surveys are typically created from a scheduled slot and track the actual execution of a store visit.
Photos are uploaded to S3 and referenced by URL.

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
- Photos reference S3 URLs; presigned URLs are handled outside this module
- AI results are written by an external pipeline, not by user actions
- Survey status flow: `pending` → `in_progress` → `completed`
