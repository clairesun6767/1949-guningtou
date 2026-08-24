# Guningtou Cartographic Surface Implementation V0.5

Implementation date: 2026-08-23

## Visual architecture

V0.5 upgrades the existing V0.4 Three.js visitor renderer instead of replacing it. The locked renderer chain remains:

1. Three.js Visitor 3D
2. Cesium Geographic Reference
3. Atlas fallback

The Three.js scene now composes a semantic museum-map surface:

1. SRTM elevation mesh at fixed 2.25× visual relief
2. OSM coastline alpha mask and shoreline line
3. Agriculture and open-ground polygons
4. Forest polygons
5. Settlement polygons and lightweight building blocks
6. Terrain-conforming road ribbons by hierarchy
7. Explicit beach polygons
8. Six canonical historical POI beacons and labels

The 45° camera baseline, centralized camera registry, six canonical Locations, shared timeline, WGS84 adapter, research mode, and fallback architecture remain intact.

## Coastline and terrain

`ThreeTerrainController` no longer accepts DEM zero values as the visual coastline. It creates a 2048-pixel-wide canvas alpha mask from the OSM land polygons and applies it as the terrain material's `alphaMap`. The DEM supplies elevation and normals only.

This removes the previous coarse grid-step coastline without introducing a larger DEM. A separate vector shoreline is sampled against terrain and rendered slightly above the surface.

The local DEM grid is 320×256. This improves terrain-normal continuity and remains near the source SRTM spacing; it is not claimed as a higher-accuracy terrain source.

## Semantic surface renderer

`ThreeCartographicLayer` builds lightweight runtime geometry:

- polygon meshes use `ShapeUtils.triangulateShape`, double-sided museum-map materials, polygon offset, and terrain-relative heights;
- road lines are densified for elevation sampling and expanded into primary, secondary, and local ribbons;
- modern building footprints become capped instanced low blocks;
- regional and local groups cross-fade with their matching terrain LOD;
- every group is connected to the existing Layer Manager.

Central styling lives in `HistoricalCartographicStyle.ts`. The height stack is deliberately small:

| Surface | Offset above sampled terrain |
| --- | ---: |
| Land cover / vegetation / settlement | 0.35 m visual equivalent |
| Beach | 0.60 m visual equivalent |
| Roads | 1.20 m visual equivalent |
| Coastline | 2.00 m visual equivalent |

Polygon offset is also enabled to prevent z-fighting without visibly floating the map.

## Layer Manager

No second layer manager was created. The existing manager now exposes:

- Terrain
- Coastline
- Land Cover
- Roads
- Settlements
- Vegetation
- Beaches
- Historical POI
- Battle Events
- Historical Imagery
- Labels
- Research Layer

Visitor defaults are ON for terrain, coastline, land cover, roads, settlements, vegetation, beaches, historical POI, battle events, and labels. Modern debug, candidate routes, research layer, and historical imagery are OFF. Historical imagery is disabled in the UI while GCP/georeference status remains incomplete.

Research mode discloses OSM/ODbL, acquisition date, SRTM elevation-only use, and each selected POI's `referenceEra`.

## Camera story zones

The locked `CameraPresetId` union was not expanded. Four external logical story zones reuse the existing destinations:

| Story zone | Existing camera preset |
| --- | --- |
| `guningtou_overview` | `battle_overview` |
| `north_south_villages` | `story_mode` |
| `landing_coast` | `landing_coast` |
| `anqi_sector` | `story_mode` |

They are available from the existing Locations panel.

## POI and label redesign

Canonical POIs now use a low circular base, thin stem, small gold cap, restrained side-support color, and an animated selected ring. No giant cone or unsupported faction color is used.

Desktop renders all six labels. Explicit offsets prevent the two Longkou labels and the Nanshan/Beishan labels from colliding. Mobile prioritizes Longkou Coast, Anqi, Nanshan, and Beishan; the other canonical points remain selectable through the Locations panel.

## Developer QA and runtime

Development QA is available by adding `?qa=1` to the map URL. It tests coastline, farmland, forest, settlements, roads, beach, POI, and labels and reports draw calls, triangles, DEM grids, and semantic feature counts. Pitch and relief A/B controls were removed.

Normal visitor entry lazy-loads the Three renderer. The Cesium engine remains behind its separate lazy renderer and was not observed in the normal visitor page asset inventory. The V0.5 production build reports:

- Three renderer chunk: 589,017 bytes (approximately 589 KB)
- Cesium engine chunk: 4,841,547 bytes, still isolated
- Regional cartography: 505,997 bytes raw / 96,382 bytes gzip
- Local cartography: 289,964 bytes raw / 35,400 bytes gzip
