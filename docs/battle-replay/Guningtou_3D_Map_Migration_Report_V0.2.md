# Battlefield_OS — Guningtou Historical Map Migration Report V0.2

## Outcome

The former Leaflet map and its hard-coded landing/counterattack polylines have been removed from the production route. The replacement is an evidence-aware, renderer-neutral historical atlas implemented with the project's existing Astro + React stack.

No manually verified Location coordinate was edited, recalculated, rounded, or replaced. The production experience reads the six canonical GeoJSON Points directly. Canonical routes remain empty, and no topology, corridor, arrow, or visual transition is promoted to a factual route.

## Experience architecture

1. **Kinmen–Xiamen strategic atlas** — a restrained 2.5D regional orientation scene with schematic coastline treatment and a camera fly-to entry.
2. **Guningtou landscape explorer** — the 1944 aerial image, explicitly marked as georeference-pending, plus all six canonical Location markers and evidence cards.
3. **Battle evolution timeline** — 10/25, 10/26, and 10/27 narrative states sourced by existing event/source identifiers; descriptions explicitly avoid claiming precise movement geometry.

Centralized camera presets cover `strategic`, `kinmen`, `guningtou`, `landing_coast`, `battle_overview`, `poi_focus`, and `story_mode`. The detail-scene presets use bounded scale/tilt values so all canonical POIs remain reachable on desktop and mobile.

## New files

- `src/components/map/HistoricalMapExperience.tsx`
- `src/components/map/historical-map.css`
- `src/battle-replay/visualization/types.ts`
- `src/battle-replay/visualization/cameraPresets.ts`
- `src/battle-replay/visualization/engine.ts`
- `src/battle-replay/visualization/index.ts`
- `tests/battle-replay/historical-map-visualization.test.mjs`
- `docs/battle-replay/Guningtou_3D_Visual_Audit_V0.1.md`
- `docs/battle-replay/Guningtou_3D_Map_Architecture_V0.2.md`
- `docs/battle-replay/Guningtou_3D_Map_Migration_Report_V0.2.md`

## Modified integration points

- `src/components/map/BattleMap.tsx` — retained as a deprecated compatibility wrapper; no fabricated polylines remain.
- `src/components/hero/HeroMap.tsx` — now uses the compact historical-map experience.
- `src/pages/[lang]/index.astro` — supplies the active locale to the hero.
- `src/pages/[lang]/battlefield-os.astro` — replaces the placeholder with the production map and an honest data-boundary note.
- `src/battle-replay/index.ts` — exports the visualization contract.

## Preserved source-of-truth data

- `data/battles/guningtou-1949/locations.geojson`: six manually calibrated Point geometries, unchanged by this migration.
- `data/battles/guningtou-1949/routes.geojson`: zero promoted routes.
- Existing source and event identifiers used by the timeline.
- `public/aerial-1944.png`: loaded lazily only after entering the detail scene and labelled as georeference-pending.

## Layer and evidence behavior

- Visitor mode exposes terrain styling, historical POIs, available imagery, labels, and only production-safe battle features.
- Candidate routes and the research layer are disabled until Historical Evidence Mode is enabled.
- Even in research mode, candidate material remains visually and semantically distinct; it is never promoted to a verified route.
- POI cards expose source IDs and confidence, with additional identifiers/provenance in research mode.
- Empty battle areas, fronts, directions, corridors, and verified routes remain empty instead of being illustrated with invented geometry.

## Responsive and performance behavior

- Desktop uses oblique atlas camera transitions, floating evidence cards, and a centered control dock.
- At 820px and below, controls become horizontally scrollable and evidence cards become bottom sheets.
- At 560px and below, nonessential contour/strategic labels are reduced; page-level horizontal overflow is prevented.
- The 1944 aerial image is lazy-mounted only for the Guningtou detail scene.
- Reduced-motion preferences disable camera/flow/beacon animation.

The new `HistoricalMapExperience` client chunk is small compared with the existing legacy location explorer. The production build still reports Vite's existing `>500 kB` chunk warning; further code-splitting of `LocationExplorer` is a separate optimization task.

## Verification results

Run on 2026-08-23:

- `npm run validate:battle-data` — exit 0; package errors 0, warnings 0; promoted routes 0. Calibration remains honestly `Incomplete` with four expected warnings for zero GCPs and pending imagery georeference.
- `npm run typecheck` — exit 0; 82 files, 0 errors, 0 warnings, 0 hints.
- `npm run test:battle-data` — exit 0; 27 passed, 0 failed.
- `npm run build` — exit 0; 275 static pages built.
- Browser route checks — Traditional Chinese home/map/Battlefield OS, Simplified Chinese map, and English map all loaded without a 404 and mounted the historical map.
- Desktop interaction checks — camera entry, six canonical POIs, evidence card, layer manager, research-mode gate, and 10/26 timeline state verified.
- Mobile check at 390 × 844 — no horizontal document overflow; controls remain operable; POI card stays within the viewport as a bottom sheet.

## Known limitations and required historical work

1. The 1944 imagery has no approved GCP transform. It must not be presented as spatially aligned terrain until georeferencing is completed and reviewed.
2. No verified DEM, historical coastline, battle area/front, direction, corridor, route, or camera cue dataset currently exists in the canonical package.
3. The strategic regional landforms and broad flow marks are orientation graphics, not measured historical geometry.
4. POI event/person/media relationships remain sparse where the canonical package has no approved links; the UI says so instead of filling gaps.
5. A future Cesium/Three renderer can consume the same feature, confidence, layer, and camera contracts after verified terrain data exists.
