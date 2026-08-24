# Guningtou Three Terrain Implementation V0.4

Date: 2026-08-23

## Renderer hierarchy

```text
BattleMapFeature[]
  -> shared historical visibility / timeline engine
  -> ThreeHistoricalTerrainRenderer (visitor default)
  -> CesiumHistoricalRenderer (geographic reference)
  -> Atlas renderer (non-WebGL fallback)
```

Three.js is lazy-loaded near the map viewport. Cesium remains lazy and is only loaded when selected or when Three initialization fails. If Cesium also fails, the existing Atlas scene is shown.

The production UI exposes three explicit modes: Visitor 3D, Geographic Reference, and Atlas Fallback. Homepage and `/map/` default to Visitor 3D.

## Three modules

- `three/ThreeHistoricalTerrainRenderer.tsx`: React lifecycle, dev-only QA controls, capture surface, resize and error routing.
- `three/ThreeScene.ts`: scene, renderer, lighting, fog, sea, LOD crossfade, labels, picking, capture, disposal.
- `three/ThreeTerrainController.ts`: terrain asset validation, clipped `BufferGeometry`, coastline line segments, height sampling and disposal.
- `three/ThreeCameraController.ts`: camera destinations, easing, reduced motion and constrained orbit.
- `three/ThreePoiLayer.ts`: six canonical markers, CSS2D labels and raycast selection.
- `three/HistoricalTerrainStyle.ts`: centralized camera, palette, sea, lighting, fog, relief, label and POI values.
- `visualization/adapters/threeAdapter.ts`: WGS84-to-local-metre conversion and camera mapping.

Only Three.js core plus its bundled `OrbitControls` and `CSS2DRenderer` addons are used. No separate control or label library was added.

## Camera and interaction

- `PerspectiveCamera` FOV: 36°.
- Default visual pitch: 45°.
- Tested pitches: 35°, 45°, 55°.
- Orbit polar constraints: 35°–64°.
- Strategic view uses a very slow drift unless reduced motion is requested.
- Entry sequence retains the existing strategic → Kinmen → Guningtou camera states.
- Regional and local terrain are loaded together before interaction; the camera transition crossfades LOD opacity.
- Transparent LOD materials disable depth writes during a fade, and a fully faded mesh is hidden. This prevents z-fighting without a black frame or snap.

## Terrain style

- Selected vertical exaggeration: 3×, renderer-only.
- Land: vertex-colored `MeshStandardMaterial`, muted khaki/stone palette, roughness 0.96.
- Sea: separate deep desaturated green plane, opacity 0.96.
- Light: hemisphere light plus warm directional light; shadows disabled on mobile.
- Atmosphere: restrained linear fog with no post-processing blur.
- Coast: source-derived clipped mesh boundary plus a light coastline line.
- Display base: shallow dark slab beneath the sea/terrain miniature.

## Labels and POIs

Regional labels: Xiamen, Kinmen, Dadeng, Xiaodeng, Guningtou.  
Local labels: the six canonical Locations from `locations.geojson`.

Labels use CSS2D objects and scale naturally through camera distance. Secondary strategic labels are hidden on narrow screens. Mobile local camera range is increased to keep all six label boxes inside 390 CSS pixels. POI selection uses Three raycasting and opens the existing evidence card; no replacement evidence data is introduced.

## Performance

| Asset/chunk | Minified size |
| --- | ---: |
| Three visitor renderer | 566,412 B |
| Cesium reference renderer | 4,841,547 B |
| Regional terrain JSON | 86,177 B |
| Local terrain JSON | 79,246 B |

The Three chunk is 11.7% of the Cesium chunk (88.3% smaller). Desktop pixel ratio is capped at 1.75; mobile at 1.25. Mobile disables terrain shadows and uses the same geographic mesh with a wider camera range.

## Verification

- Battle package validation: errors 0, warnings 0.
- Calibration audit: errors 0; four expected warnings for two 1944 images with zero GCPs and pending georeference.
- Typecheck: 0 errors, 0 warnings.
- Tests: 36 passed, 0 failed.
- Static build: 275 pages built.
- Routes promoted: 0.
- Renderer switching verified: Three ready, Cesium ready, Atlas idle/static, Three remount ready.
