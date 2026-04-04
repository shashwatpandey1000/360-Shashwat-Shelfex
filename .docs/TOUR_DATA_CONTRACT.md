# Tour Data Contract

> What data format the platform needs from the capture app and AI pipeline to render 360° virtual tours with shelf-level product detection.
>
> **For:** Capture App team, AI team, Web Platform team.

---

## Background

Every virtual tour system — Matterport, Google Street View, krpano — uses the same core model: a **graph of panoramic nodes connected by navigation links**. We do too.

- **Matterport** links scenes using LiDAR depth + visual feature matching. They get 3D mesh and fly-through transitions from that.
- **Google Street View** links scenes using GPS coordinates + visual features. Navigation arrows point toward each connected photo's GPS position.
- **We** link scenes using **compass headings recorded during walks** between capture points. No LiDAR, no reliable indoor GPS. Just the phone's magnetometer. This gives us direction — which is all we need to place navigation arrows correctly.

The MVP capture app (`tour-app-native`) already produces multi-scene tours but the hotspot placement was incorrect when I last pushed the code during the handover. 
---

## The Tour Manifest (`tour.json`)

One JSON file per tour. This is what the viewer loads to render everything.

### Required Now (v1 — what the MVP already produces)

```jsonc
{
  "tourId": "tour_1773473905042",
  "createdAt": "2026-03-14T07:40:48.571Z",

  "scenes": [
    {
      "sceneId": "scene_1773473905042",
      "panoramaUrl": "https://cdn.shelfex360.com/.../panorama.jpg",
      "captureStartHeading": 86.1,        // compass bearing of panorama center (0-360)
      "location": { "latitude": 28.39, "longitude": 77.04 }  // nullable, unreliable indoors
    }
  ],

  "hotspots": [
    {
      "fromSceneId": "scene_1773473905042",
      "toSceneId": "scene_1773474056861",
      "yaw": 67.37,       // where to place the arrow in the panorama (0-360, viewer-space)
      "pitch": -20.0      // below horizon for floor-level nav arrows
    }
  ]
}
```

### Required Later (v2 — production additions)

These fields get added to the same manifest. Old manifests without them still work.

```jsonc
{
  "version": "2.0",
  "storeId": "store_uuid",
  "surveyId": "survey_uuid",             // null for baseline tour
  "capturedBy": "user_uuid",

  // per scene — additions:
  "scenes": [{
    // ...existing v1 fields...
    "label": "Entrance",                  // optional, human-readable
    "order": 0,                           // capture sequence
    "floor": 0,                           // multi-floor, future
    "thumbnailUrl": "https://..."         // 400px preview
  }],

  // NEW: shelf markers on the panorama
  "shelfHotspots": [
    {
      "shelfId": "shelf_uuid",
      "sceneId": "scene_1773473905042",
      "yaw": 145.0,                       // marker position in panorama
      "pitch": 5.0,
      "label": "Shelf A1 — Snacks",
      "boundingBox": {                     // optional — for AI crop & highlight
        "yawLeft": 130.0,
        "yawRight": 160.0,
        "pitchTop": 20.0,
        "pitchBottom": -10.0
      },
      "shelfImageUrl": "https://..."      // optional — pre-cropped shelf photo
    }
  ]
}
```

---

## How Scene Linking Works

Just so the data makes sense — this is what the capture app does:

1. User captures Scene A (74 photos → stitched panorama). Phone's initial compass heading = `captureStartHeading`.
2. User taps "Walk to next spot." App records **departure heading** (compass bearing at that moment).
3. User walks to next position, taps "I'm here." App records **arrival heading**.
4. User captures Scene B.

Each walk produces **two hotspots** (bidirectional):
- On Scene A: arrow pointing toward B, placed at `f(departureHeading, A.captureStartHeading)`
- On Scene B: arrow pointing back to A, placed at `f((arrivalHeading+180)%360, B.captureStartHeading)`

---

## Shelf Hotspots

Shelves are marked on the panorama after stitching. 
The viewer shows a marker icon at each shelf's `(yaw, pitch)`. On click → overlay panel with shelf photo + AI results.

---

## AI Output Format

> Not blocking the tour viewer. Needed when we integrate product detection.

---

## Live Example (What the MVP Produces Today)

```json
{
  "tourId": "tour_1773473905042",
  "scenes": [
    {
      "sceneId": "scene_1773473905042",
      "panoramaUri": "file:///data/.../scene_1773473905042_pano.jpg",
      "captureStartHeading": 86.1,
      "location": { "latitude": 28.39755, "longitude": 77.0410133 }
    },
    {
      "sceneId": "scene_1773474056861",
      "panoramaUri": "file:///data/.../scene_1773474056861_pano.jpg",
      "captureStartHeading": 119.3,
      "location": { "latitude": 28.3957279, "longitude": 77.040649 }
    }
  ],
  "hotspots": [
    { "fromSceneId": "scene_1773473905042", "toSceneId": "scene_1773474056861", "hotspotYaw": 67.37, "hotspotPitch": 0 },
    { "fromSceneId": "scene_1773474056861", "toSceneId": "scene_1773473905042", "hotspotYaw": 129.85, "hotspotPitch": 0 }
  ],
  "createdAt": "2026-03-14T07:40:48.571Z"
}
```

Two scenes, two hotspots (bidirectional). The v2 schema adds fields on top of this — doesn't break it.
