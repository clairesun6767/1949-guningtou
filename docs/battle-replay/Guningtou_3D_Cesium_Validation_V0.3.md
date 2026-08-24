# Guningtou 3D Cesium Validation V0.3

Date: 2026-08-23

## Historical integrity

- Canonical Location source modified: **0**.
- Canonical Location coordinates rounded/snapped/recalculated: **0**.
- Six Point coordinates mapped exactly from GeoJSON to the Cesium adapter: **pass**.
- Production verified routes: **0**.
- Routes promoted by adapter: **0**.
- Cesium route polylines generated: **0**.
- Synthetic battle areas/fronts/directions/corridors: **0**.
- 1944 aerial attached as aligned terrain overlay: **no**.

## Automated validation

- `npm run typecheck`: 90 files, 0 errors, 0 warnings, 0 hints.
- `npm run test:battle-data`: 33 pass, 0 fail. The original 27 tests remain passing; six V0.3 adapter/static/lifecycle test groups were added.
- `npm run validate:battle-data`: package errors 0, package warnings 0, promoted routes 0.
- Calibration remains `Incomplete` with the expected four warnings: zero GCPs and pending georeference for two historical images.
- `npm run build`: exit 0, 275 static pages, 389 Cesium runtime files copied.
- Static asset probes: Natural Earth tile metadata HTTP 200; Cesium worker HTTP 200.

## Browser validation — 1440 × 900

Traditional Chinese `/zh-tw/map/`:

- renderer `cesium`, status `ready`, canvas count 1.
- `strategic → kinmen → guningtou` state sequence completed without scene reload.
- camera then reached `poi_focus` through the accessible 安岐 Location action.
- existing evidence card displayed `LOC-GUN-0003`, `SRC-0001`, and `probable` confidence.
- Research control switched mode on; Candidate Routes became available but displayed the explicit zero-geometry notice.
- 10/26 timeline state changed to `反擊與戰線收縮` through the existing slider state.
- document horizontal overflow: false.

Route regression:

- `/zh-tw/map/`: ready, one canvas, no 404.
- `/zh-cn/map/`: ready, one canvas, localized heading, no 404.
- `/en/map/`: ready, one canvas, localized heading, no 404.
- `/zh-tw/battlefield-os/`: ready, one canvas, no duplicate Viewer, no 404.

Homepage `/zh-tw/`:

- compact mode active.
- renderer ready with one canvas.
- strategic camera active.
- full map controls hidden.
- strategic heading and Enter Battlefield CTA present.

## Browser validation — 390 × 844

- renderer `cesium`, status `ready`, canvas count 1.
- entry reached `guningtou`, then Location selection reached `poi_focus`.
- six canonical Locations present in the keyboard/touch list.
- evidence card stayed within the map width (`left 12 px`, `right 363 px`).
- control dock remained horizontally scrollable (`client 335`, `scroll 389`).
- document horizontal overflow: false.

## WebGL fallback

Before a usable WebGL context was available, the same browser session selected Atlas mode and displayed the localized fallback notice instead of a blank surface. After applying the explicit viewport/GPU surface, Cesium initialized successfully. This validates both branches of the renderer selection path.

The in-app screenshot compositor does not reliably reproduce WebGL pixels in captured still images, so pixel-level terrain/label judgement was not used as the sole pass criterion. Viewer readiness, one live canvas, Cesium credit DOM, asset HTTP results, camera-state transitions, picking-driven POI state, and absence of render-error fallback were checked together.

## Bundle and deployment

- Historical map initial interactive chunk: 40,069 bytes.
- Lazy Cesium wrapper: 9,182 bytes.
- Lazy Cesium engine chunk: 4,841,547 bytes.
- Cesium widget CSS: 23,810 bytes.
- Static Cesium runtime assets: 7,098,040 bytes across 389 files.
- Base path is fixed after module import with `buildModuleUrl.setBaseUrl('/1949-guningtou/cesiumStatic/')`.

## Remaining limitations

- No approved GCP/georeferenced historical aerial overlay.
- No verified 1949 terrain reconstruction.
- No canonical battle area, front, direction or corridor geometry.
- No verified or reviewed candidate route geometry.
- No historical 3D buildings, photogrammetry, soldiers, vehicles or battle animation.
- Token-free deployment uses WGS84 ellipsoid rather than local elevation terrain; optional World Terrain is modern reference only.
