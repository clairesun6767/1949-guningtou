# Guningtou_3D_Map_Architecture_V0.2

Version: 0.2  
Date: 2026-08-23

## 1. Architecture decision

The redesign keeps Astro + React and introduces a renderer-neutral historical-map domain under `src/battle-replay/visualization/`. The first production renderer is a lightweight stylized 2.5D atlas built with React, SVG, CSS perspective, and the existing 1944 image as explicitly non-georeferenced historical texture. It does not claim DEM precision or a verified aerial transform.

Leaflet remains available for modern-reference utilities and legacy detail pages. It is removed from the primary historical storytelling path. CesiumJS and Three.js are not added in V0.2 because neither a verified terrain source nor a production renderer currently exists; adding both would increase bundle and GPU cost without improving historical accuracy. A future adapter may replace the visual surface while retaining the contracts below.

## 2. Three geographic levels

### Level 1 — Kinmen–Xiamen strategic atlas

- Low-detail illustrated sea/land scene.
- High-confidence strategic labels only: Xiamen, Dadeng, Xiaodeng, Kinmen, Guningtou.
- No troop LineStrings.
- Entry action runs a continuous preset sequence: `strategic → kinmen → guningtou`.
- Strategic shapes and labels are presentation references, not canonical battle geometry.

### Level 2 — Guningtou historical landscape

- Uses the six manually verified canonical Location Points as SSOT.
- Projects original WGS84 coordinates into a bounded local scene without altering them.
- Historical imagery is lazy-mounted and labeled “pending georeference”.
- POI selection drives `poi_focus`; the information card exposes only available canonical fields and honest placeholders for people, events, images, and documents.
- Guided tour order is derived from the six canonical features, not prompt examples or legacy coordinates.

### Level 3 — Battle evolution timeline

- Three-day map timeline: 1949-10-25, 1949-10-26, 1949-10-27.
- Timeline changes narrative context and feature visibility through a pure filtering engine.
- Canonical events/areas/directions/corridors are empty; the UI therefore does not invent them.
- Existing legacy event IDs and source-linked summaries may be shown as contextual text with approximate confidence, but do not create geometry.

## 3. BattleMapFeature contract

```ts
type BattlePrimitiveType =
  | 'location'
  | 'event'
  | 'area'
  | 'direction'
  | 'corridor'
  | 'front'
  | 'route';

type HistoricalConfidence =
  | 'verified'
  | 'probable'
  | 'approximate'
  | 'interpretive';

interface BattleMapFeature {
  id: string;
  type: BattlePrimitiveType;
  geometry: GeoJsonGeometry | null;
  time?: string;
  timeRange?: { start: string; end: string };
  side?: 'roc' | 'pla' | 'civilian' | 'neutral' | 'unknown';
  confidence: HistoricalConfidence;
  sourceIds: string[];
  relatedLocations: string[];
  relatedPeople: string[];
  description?: LocalizedText;
  visibility: 'production' | 'research' | 'hidden';
  researchOnly: boolean;
  historicalRouteStatus?: 'verified' | 'candidate' | 'deprecated' | 'insufficient_evidence';
}
```

Rules:

- `route` requires LineString/MultiLineString and `historicalRouteStatus=verified` to appear in production.
- candidate/deprecated/insufficient-evidence routes are research-only.
- `direction`, `corridor`, and `front` may be null until reviewed geometry is authored; the engine must not synthesize coordinates.
- `verified` confidence requires source IDs and approved geometry.
- all feature types pass one shared validation function before rendering.

## 4. Camera system

Camera values live only in `cameraPresets.ts`:

- `strategic`
- `kinmen`
- `guningtou`
- `landing_coast`
- `battle_overview`
- `poi_focus`
- `story_mode`

Each preset includes scale, translation, tilt, duration, LOD, and atmosphere level. The React renderer consumes preset data as CSS variables. `prefers-reduced-motion` collapses cinematic duration without changing geographic state.

## 5. Layer Manager

Layer IDs:

- Terrain
- Modern Reference
- Historical POI
- Battle Events
- Battle Areas
- Battle Directions
- Battle Corridors
- Verified Routes
- Candidate Routes
- Historical Imagery
- Labels
- Research Layer

Visitor defaults:

- Terrain, Historical POI, Historical Imagery, Labels: on.
- Verified Routes: on but empty.
- Candidate Routes, Modern Reference, Research Layer: off.
- Candidate Routes cannot become visible unless Historical Evidence Mode is enabled.

Unavailable layers remain visible in the compact layer panel with a zero-data explanation instead of generating placeholder geometry.

## 6. Historical Evidence Mode

Research mode exposes:

- Location IDs and original WGS84 coordinates.
- confidence and verification state.
- source IDs.
- geometry type/status.
- candidate-route layer availability.

It does not promote or create data. Turning the mode off restores visitor presentation and hides research metadata.

## 7. Progressive loading and resource lifecycle

- Strategic scene loads first without Leaflet, remote tiles, or historical imagery.
- The 1944 image is mounted only after entering Guningtou or selecting the imagery layer.
- High-detail POI labels and contour decoration are reduced on small screens.
- No WebGL context is created in V0.2, so there is no unmanaged GPU resource lifecycle.
- A future renderer adapter must implement disposal for geometries, textures, materials, event listeners, and terrain tiles.

## 8. Mobile behavior

- Camera surface uses `touch-action: pan-y` in page mode and explicit controls rather than hijacking scroll.
- POI details become a bottom sheet.
- Timeline remains at the bottom of the map experience.
- Layer controls become a compact popover.
- Decorative relief, haze, and nonessential strategic labels are reduced.
- Cinematic movement respects reduced-motion and uses shorter transitions on narrow screens.

## 9. Route migration

- Remove hardcoded production polylines from the active map route.
- Preserve `data/route_database.json`, external KML, route audit, and canonical empty `routes.geojson`.
- Add `historicalRouteStatus` to the visualization contract.
- Production visibility accepts only verified canonical routes.
- Research mode may display candidate routes only after such routes exist in an explicit research feature source; V0.2 has zero candidate geometries.

## 10. Test boundaries

Automated tests cover:

- BattleMapFeature schema and confidence validation.
- camera preset completeness and numeric validity.
- timeline filtering.
- production route visibility.
- research-mode gating.
- canonical GeoJSON coordinate regression.
- browser smoke checks at desktop and mobile viewport.
- static production build.

## 11. Future renderer adapter

A future Cesium or Three implementation should consume the same `BattleMapFeature[]`, camera preset names, layer state, and timeline filter. It must not read legacy route topology directly or bypass feature validation. Cesium is the preferred candidate for verified geographic terrain and multi-scale camera navigation; Three.js is optional for custom battle overlays and effects after geometry provenance is available.

