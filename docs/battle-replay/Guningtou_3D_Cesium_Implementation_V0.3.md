# Guningtou 3D Cesium Implementation V0.3

## Architecture

```text
canonical GeoJSON + BattleMapFeature[]
                 │
                 ▼
      Historical Map Engine
      timeline / layers / evidence
                 │
          cesiumAdapter.ts
                 │
        ┌────────┴────────┐
        ▼                 ▼
Cesium renderer      V0.2 Atlas renderer
WebGL geographic     fallback / low-end / tests
```

Cesium consumes `BattleMapFeature[]`, `LayerState`, `TimelineFilter`, and existing `CameraPresetId`. There is no `CesiumBattleFeature` type and no Cesium-specific domain store.

## Renderer modules

- `CesiumHistoricalRenderer.tsx`: React lifecycle, lazy boundary, ready/error signals.
- `CesiumScene.ts`: Viewer creation, static asset base, click picking, render errors, teardown.
- `CesiumCameraController.ts`: geographic preset application through `camera.setView` and `camera.flyTo`.
- `CesiumPoiLayer.ts`: canonical POI beacons and strategic geographic labels.
- `CesiumLayerController.ts`: shared Layer Manager state applied to imagery, labels, POIs, and timeline visibility.
- `CesiumTerrainController.ts`: packaged Natural Earth geographic reference and terrain source metadata.
- `CesiumAtmosphere.ts`: restrained fog, lighting, sky and GPU-detail settings.
- `visualization/adapters/cesiumAdapter.ts`: pure WGS84 mapping, renderer choice, camera destinations and shared visibility filtering.

## Camera

The V0.2 preset names remain unchanged. Cesium destinations are renderer-adapter values, not domain fields:

| Preset | Geographic intent | Desktop height |
| --- | --- | ---: |
| `strategic` | Xiamen–Kinmen maritime context | 132,000 m |
| `kinmen` | island scale | 36,000 m |
| `guningtou` | battlefield overview | 9,200 m |
| `landing_coast` | northern landing/coast focus | 3,300 m |
| `battle_overview` | reset battlefield overview | 7,600 m |
| `poi_focus` | selected canonical Location | 2,400 m |
| `story_mode` | guided narrative scale | 5,400 m |

`strategic → kinmen → guningtou` uses continuous Cesium `camera.flyTo` calls without reloading the Viewer. POI focus replaces only the runtime destination longitude/latitude with the selected canonical Point. Mobile keeps the same destination but raises camera height by 32%, steepens pitch and shortens duration. Reduced-motion resolves to the same destination with zero-duration movement.

## Terrain and visual style

- Default: WGS84 ellipsoid plus packaged Natural Earth II reference imagery.
- Optional token mode: Cesium World Terrain, always marked modern.
- Dark blue-gray background, desaturated imagery, muted land color, reduced sky saturation and subtle fog.
- All native Cesium GIS controls are disabled. Battlefield_OS DOM controls remain authoritative.
- Cesium credits remain visible.

## POI mapping

The adapter accepts only existing `BattleMapFeature` locations with Point geometry. Each longitude/latitude pair is passed directly to `Cartesian3.fromDegrees`. Runtime height uses `CLAMP_TO_GROUND`; no sampled height is written back.

Six POIs are rendered as restrained SVG historical beacons with distance scaling/fade. Cesium picking returns the existing feature ID to `HistoricalMapExperience`, which opens the existing evidence card. The accessible Locations panel remains the keyboard navigation surface.

## Layers and timeline

The existing Layer Manager controls the Cesium renderer. `Historical POI` controls the POI data source; `Labels` controls strategic/POI labels; `Terrain` controls reference surface lighting; `Modern Reference` changes reference imagery emphasis. Empty events/areas/directions/corridors/routes remain empty.

Timeline changes call the shared `filterVisibleFeatures` engine through the adapter. Entity visibility is updated from the filtered ID set; Cesium contains no separate timeline logic.

Research Mode exposes the existing evidence card metadata and enables the Candidate Routes control. With zero reviewed candidate geometry it explicitly reports “No reviewed candidate route geometry available.” No placeholder primitive is created.

## Historical imagery

The 1944 image is deliberately outside the Cesium imagery collection. In Level 2 it appears only as a small floating comparison panel with `GEOREFERENCE PENDING`. This preserves V0.2's evidence status until GCP approval.

## Fallback and cleanup

`chooseHistoricalRenderer` selects Atlas for explicit Atlas mode, absent WebGL, initialization failure, render error, or very low reported memory. The Atlas surface stays available until Cesium reaches ready state.

Cleanup cancels active flights, removes input/render handlers, destroys data sources and imagery layers, and calls `viewer.destroy()`. Route navigation therefore cannot accumulate canvases or WebGL contexts.

## Mobile and accessibility

- Mobile Viewer uses lower-power context preference, no antialiasing, larger screen-space error and a smaller tile cache.
- Controls remain horizontally scrollable; timeline remains the bottom dock; evidence card remains a bottom sheet.
- Full-page horizontal overflow is prevented at 390 px.
- Canvas is not the only navigation surface: Locations, Layers, Timeline, Research and Story controls remain semantic DOM controls.

## Performance strategy

React `lazy()` separates the renderer wrapper. Cesium itself is a second dynamic import inside `CesiumScene.create()`. IntersectionObserver starts loading only when the map is near the viewport. The packaged 1944 image stays lazy and is mounted only in the detail/reference panel.

