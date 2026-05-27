# 360° Tour Viewer — Design Spec

**Date:** 2026-05-27
**Branch:** 360_view
**Status:** Approved — ready for implementation

---

## Overview

Build a 360° panoramic tour viewer for ShelfEx. The viewer opens as a fullscreen modal from the store detail page, renders equirectangular panoramas using Photo Sphere Viewer (PSV), shows shelf hotspots as clickable markers with tooltips, and allows navigation between scenes with prev/next arrows.

This is a client-only feature built on top of the existing `tours` server module and `features/tours` client module. No new API endpoints are required beyond what is already available.

---

## User Experience

- A "View Tour" button on the store detail page opens the viewer
- The viewer fills the screen as a dark fullscreen modal (shadcn `Dialog`)
- The panorama is draggable/tiltable (PSV default behavior)
- Amber hotspot dots mark shelf positions; clicking one shows a tooltip with the shelf label and position number
- Prev/Next arrow buttons (left/right edges) navigate between scenes in `displayOrder` sequence
- A pill at the bottom shows "Scene N of M — {label}"
- The top bar shows the store name and a ✕ close button
- Pressing Esc closes the modal (shadcn Dialog default)

### States

| State | Behavior |
|-------|----------|
| Loading | Spinner centered in modal while `useActiveTourQuery` is pending |
| No tour | Empty state message: "No tour available for this store yet." |
| Error | Error message + Retry button inside the modal |
| Active (no scenes) | Empty state: "This tour has no scenes." |

---

## Architecture

### Placement

All new code lives inside `client/features/tours/`. No new feature module is needed.

### New Components

| File | Responsibility |
|------|----------------|
| `features/tours/components/TourViewerModal.tsx` | Fullscreen modal shell. Fetches tour data via `useActiveTourQuery`. Manages `sceneIndex` in local state. Renders `PanoramaViewer` and `SceneNavControls`. |
| `features/tours/components/PanoramaViewer.tsx` | Wraps PSV. Receives `panoramaUrl` and `shelves[]` as props. Maps shelves to PSV marker configs. Pure presenter — no data fetching. Must be `'use client'` and dynamically imported. |
| `features/tours/components/SceneNavControls.tsx` | Prev/Next arrow buttons overlaid on the panorama. Receives `sceneIndex`, `total`, `label`, `onPrev`, `onNext` as props. |

### Modified Files

| File | Change |
|------|--------|
| `features/tours/queries.ts` | Add `useActiveTourQuery(storeId: string)` — wraps `toursApi.getActiveForStore(storeId)` |
| `features/tours/index.ts` | Export `TourViewerModal` |
| `features/tours/tours_agent.md` | Update with new components and query |

### Data Flow

```
StoreDetailPage
  → passes storeId + open/onClose to TourViewerModal
    → TourViewerModal calls useActiveTourQuery(storeId)
    → TourViewerModal tracks sceneIndex (local useState, resets to 0 on open)
    → passes scenes[sceneIndex].panoramaUrl + scenes[sceneIndex].shelves to PanoramaViewer
    → passes sceneIndex, total, label, onPrev, onNext to SceneNavControls
      → PanoramaViewer maps shelves[] → PSV MarkerConfig[]
        shelf.yaw (string) → parsed to number (degrees)
        shelf.pitch (string) → parsed to number (degrees)
        tooltip HTML: "<b>{shelf.label}</b><br/>{shelf.displayOrder}"
```

---

## Dependencies

### New packages (client)

```
@photo-sphere-viewer/core
@photo-sphere-viewer/markers-plugin
```

PSV is ESM-only. `PanoramaViewer` must:
1. Be a `'use client'` component
2. Be imported with `next/dynamic` and `{ ssr: false }` in `TourViewerModal`

### Existing infrastructure used

| Resource | Usage |
|----------|-------|
| `toursApi.getActiveForStore(storeId)` | Fetch active tour with scenes and shelves |
| `shadcn Dialog` | Modal shell — fullscreen variant |
| `lib/api/client.ts` | Already used by `toursApi` |
| `contexts/auth-context.tsx` | `hasPermission('tours:read')` gate on the trigger button |

---

## Component Contracts

### `TourViewerModal`

```tsx
interface TourViewerModalProps {
  storeId: string;
  storeName: string;
  open: boolean;
  onClose: () => void;
}
```

### `PanoramaViewer`

```tsx
interface PanoramaViewerProps {
  panoramaUrl: string;
  shelves: TourShelf[];  // from features/tours/api.ts
}
```

### `SceneNavControls`

```tsx
interface SceneNavControlsProps {
  sceneIndex: number;
  total: number;
  label: string | null;
  onPrev: () => void;
  onNext: () => void;
}
```

---

## PSV Marker Mapping

Each `TourShelf` maps to a PSV `MarkerConfig`:

```ts
{
  id: shelf.id,
  position: {
    yaw: parseFloat(shelf.yaw),    // PSV expects degrees as number
    pitch: parseFloat(shelf.pitch),
  },
  html: `<div class="shelf-hotspot"></div>`,
  tooltip: {
    content: `<b>${shelf.label}</b><br/>Position ${shelf.displayOrder}`,
    trigger: 'click',
  },
  anchor: 'center center',
}
```

The hotspot dot style (`shelf-hotspot`) is a small amber circle defined in the component's CSS module or inline styles.

---

## Error Handling

- `useActiveTourQuery` errors surface via `isError` / `error` from TanStack Query — no custom error handling needed beyond reading these flags
- If `tour.scenes` is empty or undefined, show the "no scenes" empty state
- If `panoramaUrl` is missing on a scene, skip that scene or show a placeholder — the viewer should not crash
- PSV errors (failed image load) are caught via PSV's `error` event and shown as an inline message

---

## Testing

- Unit test `useActiveTourQuery` in `features/tours/__tests__/queries.test.ts` — mock `toursApi.getActiveForStore`
- Component test `TourViewerModal` — mock the query, verify loading/empty/error states render correctly
- Component test `SceneNavControls` — verify prev/next callbacks and disabled state at boundaries
- `PanoramaViewer` is excluded from unit tests (PSV requires a real DOM + canvas); covered by manual QA

---

## Out of Scope

- Scene thumbnail strip (can be added later)
- Side panel on hotspot click (tooltip only, as decided)
- Fullscreen browser API (`⛶` expand) — shadcn Dialog already fills the screen
- Tour comparison (baseline vs current)
- Mobile-specific touch controls — PSV handles these by default
