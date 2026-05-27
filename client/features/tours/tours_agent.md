# Tours Feature

## 1. Overview
360° virtual tour management. Includes the API client layer and a fullscreen modal viewer
component. Tours are accessed from the Store Detail page via the "View Tour" button in the
"360° Tour" sidebar section.

## 2. File Map
| File | Responsibility |
|------|---------------|
| api.ts | Axios calls: `getActiveForStore`, `getById`, `list`. Exports `Tour`, `TourScene`, `TourShelf` types |
| queries.ts | `useToursQuery`, `useTourByIdQuery`, `useActiveStoreTourQuery` |
| components/TourViewerModal.tsx | Fullscreen modal shell. Props: `storeId`, `storeName`, `open`, `onClose`. Manages `sceneIndex`. Dynamically imports PanoramaViewer |
| components/PanoramaViewer.tsx | PSV wrapper. Props: `panoramaUrl`, `shelves[]`. `'use client'`, no SSR. Maps `TourShelf` → PSV marker with click tooltip |
| components/SceneNavControls.tsx | Prev/Next arrows + scene counter pill. Props: `sceneIndex`, `total`, `label`, `onPrev`, `onNext` |
| index.ts | Public exports |

## 3. Public Contract
**Exports:** `toursApi`, `Tour`, `TourScene`, `TourShelf`, `useToursQuery`, `useTourByIdQuery`, `useActiveStoreTourQuery`, `TourViewerModal`, `TourViewerModalProps`

## 4. Core Rules & Edge Cases
- One tour per store (enforced server-side)
- `PanoramaViewer` must be dynamically imported with `{ ssr: false }` — PSV requires browser DOM
- `yaw` and `pitch` on `TourShelf` are stored as strings (degrees); PSV receives them as `"${value}deg"`
- `TourViewerModal` resets `sceneIndex` to 0 each time it opens or when storeId changes
- `useActiveStoreTourQuery` is already consumed in `StoreDetail` — do not add a second instance there
