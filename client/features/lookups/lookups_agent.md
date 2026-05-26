# Lookups Feature

## 1. Overview
Provides read-only reference data for dropdown/select components across the app:
industry types and store categories. These are seeded data that rarely change.
No write operations. Used by onboarding (industry selection) and store management (store category).

## 2. File Map
| File | Responsibility |
|------|---------------|
| api.ts | Axios calls: getIndustries, getStoreCategories |
| queries.ts | useIndustriesQuery, useStoreCategoriesQuery |
| types.ts | Local UI types (API types in api.ts) |
| index.ts | Public exports |

## 3. Public Contract
**Exports:** `useIndustriesQuery`, `useStoreCategoriesQuery`, `lookupsApi`

## 4. Core Rules & Edge Cases
- Set `staleTime: Infinity` on lookup queries — this data never changes without a deployment
- Used in: onboarding industry select, store add/edit dialogs
- No mutations — all writes are via `db:seed` on the server side
