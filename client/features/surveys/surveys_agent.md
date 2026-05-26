# Surveys Feature

## 1. Overview
Displays survey instances and their associated photos. Surveys represent completed or in-progress
store visits. The UI is read-heavy: survey list with status filtering and a detail view with
scene-by-scene photo browsing. Write operations (submitting survey data) happen from the mobile
app, not this dashboard.

## 2. File Map
| File | Responsibility |
|------|---------------|
| api.ts | Axios calls: list, getById |
| queries.ts | useSurveysQuery, useSurveyByIdQuery |
| mutations.ts | Placeholder (survey mutations are primarily mobile-side) |
| types.ts | Local UI filter/display types |
| components/SurveyList.tsx | Paginated survey list with status and date filters |
| components/SurveyDetail.tsx | Survey detail with scene tabs and photo grid |
| index.ts | Public exports |

## 3. Public Contract
**Exports:** `SurveyList`, `SurveyDetail`, `useSurveysQuery`, `useSurveyByIdQuery`

## 4. Core Rules & Edge Cases
- SurveyDetail accepts `id` as a prop (not useParams)
- Survey status: `in_progress` → `completed` | `processing`
- Photos are S3 URLs — display directly; do not proxy
- Survey queries may require a date range (server-side partitioned tables)
