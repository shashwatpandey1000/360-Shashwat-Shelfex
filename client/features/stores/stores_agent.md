# Stores Feature

## 1. Overview
Manages retail store UI: paginated list with map view toggle, store detail with schedule and survey tabs,
add/edit dialogs, and CSV bulk import. Stores are the primary operational unit; schedules and surveys
attach to stores.

## 2. File Map
| File | Responsibility |
|------|---------------|
| api.ts | Axios calls: list, getById, create, update, delete, bulkImport |
| queries.ts | useStoresQuery, useStoreByIdQuery |
| mutations.ts | useCreateStoreMutation, useUpdateStoreMutation, useDeactivateStoreMutation, useBulkImportStoresMutation |
| types.ts | StoreRow and StoreDetail interfaces |
| components/StoreList.tsx | Paginated store table with list/map toggle |
| components/StoreDetail.tsx | Store detail with schedule + survey tabs |
| components/MapView.tsx | Google Maps view of stores |
| components/AddStoreDialog.tsx | Create store modal |
| components/EditStoreDialog.tsx | Edit store modal |
| components/BulkImportDialog.tsx | CSV import with row-level error display |
| components/StoreScheduleTab.tsx | Store's schedule slots tab |
| components/StoreSurveysTab.tsx | Store's survey history tab |
| index.ts | Public exports |

## 3. Public Contract
**Exports:** StoreList, StoreDetail, AddStoreDialog, BulkImportDialog, EditStoreDialog, MapView, StoreScheduleTab, StoreSurveysTab, useStoresQuery, useStoreByIdQuery, useCreateStoreMutation, useUpdateStoreMutation, useDeactivateStoreMutation, useBulkImportStoresMutation

## 4. Core Rules & Edge Cases
- StoreDetail accepts `id` prop; page passes it from URL params
- BulkImport returns per-row errors — display them without stopping the overall import
- MapView requires NEXT_PUBLIC_GOOGLE_MAPS_API_KEY env var; shows placeholder if missing
- Scope filtering is handled server-side; client does not filter the stores list
