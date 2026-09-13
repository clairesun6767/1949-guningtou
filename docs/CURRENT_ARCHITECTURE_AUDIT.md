# 1949 古寧頭 Interactive Battlefield — Current Architecture Audit

## Audit metadata

- Audit date: 2026-09-13
- Repository: `https://github.com/clairesun6767/1949-guningtou`
- Baseline branch: `main`
- Baseline commit: `a8774e2becb4fa7f998e890bfb14a8b1efaf3372`
- Source specification: `1949 古寧頭 Interactive Battlefield — Codex Master Execution Spec V1.1.md`
- Audit status: Phase 0 complete; no production code changed during this audit

This document records the repository as it exists at the baseline commit. The V1.1 execution specification is treated as a target and checklist; repository code and data remain the authority for current-state claims.

## 1. Executive findings

1. The site is an Astro 7 static museum with React islands and a production Three.js historical terrain scene. It is not a green-field project and must not be rewritten.
2. The stable V0.8.x rendering stack already includes one continuous regional/local Three.js world, explicit local terrain coverage ownership, rasterized classification masks, battle movement layers, historical source traces, camera presets, and disposal paths.
3. The reusable `src/battle-replay` package already owns domain types, GeoJSON validation, legacy adaptation, coordinate conversion, visualization filtering, camera preset data, and historical trace interpretation. It is the correct boundary for the next engine layer.
4. React still owns most playback and selection state in `HistoricalMapExperience`. There is no renderer-neutral `BattlefieldState`, `TimelineEngine`, `EventEngine`, `UnitSystem`, `CameraDirector`, `RegionManager`, or `AssetManager` runtime module matching the V1.1 target APIs.
5. Historical routes remain evidence-gated. `routes.geojson` contains zero formal routes; the historical battle-map trace collection is a separate schematic source interpretation and must remain separate from canonical routes and Locations.
6. The coordinate system is consistent enough to preserve through adapters: canonical WGS84 data is projected into one Three.js local tangent plane with origin `[118.275, 24.49]`, scale `0.001 world units/metre`, north represented by negative local Z, and no rotation or datum rewrite in the runtime.
7. The current repository passes data validation, 53 battle-replay tests, typecheck, and static build. The build emits 279 HTML pages. The build still reports a large-chunk warning, which is a performance follow-up rather than a correctness failure.

## 2. Git safety and repository scan

| Check | Result | Evidence |
| --- | --- | --- |
| Current branch | PASS | `main` |
| HEAD | PASS | `a8774e2becb4fa7f998e890bfb14a8b1efaf3372` |
| Remote | PASS | `origin` points to `https://github.com/clairesun6767/1949-guningtou.git` |
| Remote divergence | PASS | `origin/main...HEAD = 0 / 0` at audit time |
| Working tree | PASS | `git status --short --branch` reported `## main...origin/main` |
| Existing checkpoint tag | PASS | `guningtou-map-v0.8.1-checkpoint` resolves to commit `515d1eb75887525620fee8d3614abf8070f69118` |
| Destructive history operation | PASS | No reset, force push, or destructive rebase used |

### Repository inventory

- `src/`: Astro pages, React islands, data loaders, battle-replay types/services/validation/visualization, Three.js and Cesium adapters.
- `data/`: legacy museum data plus the `data/battles/guningtou-1949/` battle package.
- `public/`: derived terrain, cartography, classification masks, historical map image, and aerial image assets.
- `scripts/`: asset builders and battle-data validator.
- `tests/battle-replay/`: Node test suite for domain, calibration, visualization, terrain, classification, and V0.8 regressions.
- `.github/workflows/`: two existing GitHub Pages workflows triggered by `main`.
- `docs/`: prior V0.1–V0.8 architecture, route, terrain, calibration, and visual validation records.

## 3. Framework, dependencies, and deployment

| Concern | Current implementation | Assessment |
| --- | --- | --- |
| Site framework | Astro `^7.1.6` | Preserve |
| Output | `output: 'static'`, `trailingSlash: 'always'` | Preserve |
| Deployment base | `site: https://clairesun6767.github.io`, `base: /1949-guningtou` | Preserve; all new asset URLs must use the existing base resolver |
| UI runtime | React `^19.2.8` / React DOM | Preserve for UI islands |
| Primary 3D renderer | Three.js `^0.185.1` | Preserve; it is the stable visitor renderer |
| Geographic fallback/research renderer | Cesium `^1.144.0` | Preserve as an adapter; visitor renderer selection remains hidden |
| 2D/reference map | Leaflet `^1.9.4`, react-leaflet installed | Preserve for existing/reference paths; do not introduce a second primary visitor scene |
| Styling | Tailwind v4 plugin plus `src/styles/global.css` | Preserve design tokens and museum shell |
| State atoms | nanostores for language/perspective | Preserve; not suitable as a per-frame simulation store |
| Static assets | Vite static copy for Cesium and canonical map-data inputs | Preserve and extend only through the existing asset boundary |

## 4. Runtime architecture

```text
Astro static pages / multilingual routes
  └─ HistoricalMapExperience (React island)
       ├─ visitor controls, selected POI, layer state, date, playback progress
       ├─ lazy ThreeHistoricalTerrainRenderer
       │    └─ ThreeScene (one WebGL scene and render loop)
       │         ├─ regional terrain bundle
       │         ├─ local terrain bundle with coverage-mask ownership
       │         ├─ raster classification masks
       │         ├─ cartographic roads / settlements / coastline
       │         ├─ battle movement layer
       │         ├─ historical source-trace layer
       │         ├─ canonical POI layer and CSS2D labels
       │         └─ OrbitControls + ThreeCameraController
       ├─ lazy CesiumHistoricalRenderer (research/explicit fallback)
       └─ Atlas fallback

src/battle-replay
  ├─ types: WGS84 GeoJSON, entities, time, package, map references
  ├─ validation: package/reference/calibration diagnostics
  ├─ services: coordinate parsing/override, route editing, persistence, GeoJSON round-trip
  ├─ adapters: legacy data, map-reference, Three/Cesium coordinate adapters
  └─ visualization: feature filtering, camera presets, movement and historical trace semantics
```

### Existing components to preserve

- `src/components/map/three/ThreeScene.ts`: one-scene lifecycle, regional/local terrain ownership, ocean/background, render loop, stats, disposal, and QA modes.
- `src/components/map/three/ThreeTerrainController.ts`: SRTM-derived terrain mesh, coverage mask, classification mask sampling, local hole/ownership logic, and material shader hook.
- `src/components/map/three/ThreeCartographicLayer.ts`: geometry-only roads/buildings/coastline and stable opacity/depth policy.
- `src/components/map/three/ThreeBattleMovementLayer.ts` and `ThreeHistoricalTraceLayer.ts`: presentation layers consuming validated features and source traces.
- `src/battle-replay/visualization/engine.ts`: shared feature validation, date/layer filtering, visitor route gating, and current three-date visitor steps.
- `src/battle-replay/visualization/historicalTraces.ts`: source provenance, schematic registration rules, source/visitor labels, and relative phase playback.
- `src/battle-replay/visualization/adapters/threeAdapter.ts`: canonical WGS84 preservation and local tangent-plane projection.
- `src/components/dev/HistoricalBattleMapRegistrationEditor.tsx`: browser-only research editor; it downloads reviewed drafts and does not silently write canonical data.
- Existing Astro shell, language routes, GitHub Pages workflows, and design-system documents.

### Current architectural gaps

| V1.1 target | Current state | Safe direction |
| --- | --- | --- |
| BattlefieldState | Playback/date/layer/selection state is distributed in `HistoricalMapExperience` | Add a renderer-neutral state model and bridge existing UI incrementally |
| TimelineEngine | `requestAnimationFrame` playback is local to the React island; phase helpers exist | Extract pure clock/controller while keeping current timeline UI |
| EventEngine | Historical event data and date filters exist; no enter/exit runtime | Add deterministic event crossing service with no Three.js imports |
| UnitSystem | Unit data and legacy adapter exist; no runtime unit position/interpolation | Add data adapter and one clearly marked demo/test unit before any historical promotion |
| CameraDirector | Preset data plus `ThreeCameraController`/OrbitControls exist | Wrap current controller with commands; do not create per-component camera tweens |
| RegionManager | Regional/local scopes are hard-coded inside ThreeScene | Document and type region boundaries first; full streaming is P1 |
| AssetManager | ThreeScene loads a fixed set with `Promise.all` | Introduce a small base-path asset manifest only after data/state boundary is stable |
| Story data | Narrative/scenes/interactive timeline JSON exists but does not drive a runtime story | Add a data adapter later; no hard-coded historical story path in renderer |
| Performance harness | Renderer exposes calls/triangles/memory stats only in the dev QA panel | Add repeatable measurement capture before claiming FPS budgets |

## 5. Historical data inventory and truth boundary

### Legacy museum data

The current validator parsed 22 legacy JSON files with zero parse failures. Measured collections include:

| Dataset | Count / shape |
| --- | ---: |
| `sources.json` | 38 sources |
| `events.json` | 30 events |
| `timeline.json` | 123 records |
| `poi.json` | 25 legacy POIs |
| `unit_index.json` | 25 units |
| `interactive_timeline.json` | 12 segments |
| `scenes.json` | 33 scenes |
| `narrative_beats.json` | 115 beats |
| `narratives.json` | 47 narratives |
| `spatial_network.json` | 25 nodes, 36 connections, 300 distance-matrix entries |
| `terrain_database.json` | 25 POI terrain records |

### Canonical battle package

- Package: `PKG-GUN-1949-BR1`, schema `1.0.0`, role `calibration-overlay`, review status `Incomplete`.
- `locations.geojson`: 6 features, all valid `Point` geometry, all `manually-verified` in the current package; these are the canonical six and must not be rewritten by the engine work.
- `routes.geojson`: 0 features. No verified GIS route is available for production.
- `battle-movements.geojson`: 5 features, 3 `LineString` and 2 `Polygon`; four approved approximate/probable production movement interpretations plus one research-only feature.
- `historical-battle-map-traces.geojson`: 13 source-traced features, 9 `LineString` and 4 `Polygon`; 11 visitor-visible reviewed traces and 2 research-only traces. The collection remains `schematic_only` with zero enabled registration anchors.
- `historical-battle-phases.json`: 6 relative phases; `1949-10-27` intentionally has no source-trace IDs.
- Registration: `historical-battle-map-registration.json` has 0 enabled anchors, 3 candidate anchors, selected transform `none`, and status `schematic_pending`.

### Route audit verification

The existing route audit records 12 legacy route candidates: `PARTIALLY_SUPPORTED = 9`, `NO_EVIDENCE = 3`, `SUPPORTED = 0`. Existing audit decisions recommend disabling or archiving R03, R05, R07, R09, R10, and R12, without deleting their source records. The current repository already follows the most important production constraint: canonical `routes.geojson` is empty and research candidates do not leak into visitor mode.

## 6. Coordinate system audit

The full coordinate contract is recorded separately in [`COORDINATE_SYSTEM.md`](COORDINATE_SYSTEM.md). Current runtime facts are:

| Element | Current value |
| --- | --- |
| Canonical CRS | GeoJSON/WGS84 `EPSG:4326`, `[longitude, latitude]` |
| Three.js origin | `[118.275, 24.49]` (`THREE_LOCAL_ORIGIN`) |
| Projection | local tangent approximation using Earth radius 6,378,137 m and `cos(originLatitude)` for east metres |
| Three.js axes | east → `+X`; north → `-Z`; elevation → `+Y` |
| World scale | `0.001 world units/metre` |
| Rotation | none in the WGS84-to-local adapter |
| Terrain grid orientation | west→east columns; north→south rows; UV `v = 1 - row/(height-1)` |
| Terrain exaggeration | `2.25×` |
| Regional bounds | W 117.97 / S 24.34 / E 118.58 / N 24.65; grid 196×100 |
| Local bounds | W 118.285 / S 24.44 / E 118.37 / N 24.50; grid 320×256 |
| Local ownership | explicit 320×256 coverage mask with the same local bounds |
| Camera clip | perspective near `.05`, far `240` world units; OrbitControls maximum distance is 105 world units |
| Camera pitch | fixed 45° visitor orbit range in the current Three style |

No coordinate rewrite, automatic route snapping, or historical-map georeferencing was performed in this audit.

## 7. Rendering, boundary, and known-bug verification

### Static/code evidence

- One `ThreeScene` owns the regional terrain, local terrain, cartography, battle layers, POIs, labels, ocean, controls, animation loop, and disposal.
- The sea is a large `360 × 260` world-unit plane; the scene clear color is the same sea color in production, so the old visible rectangular outside background is not expected at normal camera presets.
- Regional terrain remains present while local detail mixes in from camera distance 24 to 8; local ownership is sampled from the explicit coverage mask rather than a rectangular bounding-box exclusion.
- Classification masks are generated PNGs with explicit EPSG:4326 bounds. Production uses linear, non-mipmap sampling with clamp-to-edge and anisotropy 1; QA modes keep nearest/mipmap/anisotropy variants available for isolation.
- Cartographic overlay materials disable depth writes; terrain materials retain depth writes. `ThreeScene` and each layer have explicit disposal paths.

### Local browser baseline observation

Test page: `http://localhost:4321/1949-guningtou/zh-tw/map/?qa=classification-both` in the Codex in-app browser, after the dev server was started with the workspace-required background command.

| Measurement | Result |
| --- | --- |
| Three renderer | `ready` |
| WebGL canvas | 1 |
| QA mode | `classification-both` |
| Render stats shown by QA panel | 201,735 triangles; 3 calls; DEM 196×100 / 320×256 |
| Ownership stats | regional owner samples 2,695; local owner samples 59; no-owner 0; overlap 0 |
| Classification sampling | `linear`, anisotropy `1` |
| Captured browser console | error/warn count 0 at initial load |
| Normal initial boundary | no rectangular plane edge visible in the captured viewport |

This is a runtime smoke observation, not a statistically valid FPS benchmark. Continuous zoom/orbit/pan traces and 1920×1080, 1366×768, and 390×844 FPS measurements remain a Phase 1/Performance task and are explicitly marked NOT AVAILABLE until a repeatable capture harness exists.

### Known risks to verify in Phase 1

- Extreme orbit/zoom can still expose the finite terrain/sea/camera relationship even though the normal strategic preset is covered.
- The renderer still contains multiple per-frame layer opacity updates and animated battle/trace presentation; these must be measured before calling temporal shimmer fully resolved.
- ThreeScene contains QA-only shader/filter modes; production must remain on the stable configuration while each failure layer is isolated.
- Build output includes Cesium and large image assets; lazy loading works for the map island, but bundle and memory budgets need an explicit measurement pass.

## 8. Baseline verification commands

All commands below were run at the baseline commit during this audit:

| Command | Result |
| --- | --- |
| `npm.cmd run validate:battle-data` | PASS; quality errors 0, warnings 0, info 0; calibration warnings 4 for existing incomplete imagery/GCP records |
| `npm.cmd run test:battle-data` | PASS; 53 passed, 0 failed |
| `npm.cmd run typecheck` | PASS; 0 errors, 0 warnings, 0 hints |
| `npm.cmd run build` | PASS; static output, 279 pages; existing large-chunk warning |

Build artifact observation: 718 files, 28,301,152 bytes (26.99 MiB); JavaScript 132 files / 7,908,558 bytes; CSS 34 files / 235,558 bytes. Largest relevant artifacts include Cesium `4,841,547` bytes, Three terrain renderer `652,194` bytes, the 5.38 MiB aerial image, the 2.53 MiB aerial image, and the 505,997-byte regional cartography GeoJSON.

## 9. Security and publishability audit

- `.gitignore` excludes `dist/`, `.astro/`, `.cache/`, `.vite/`, `cache/`, `coverage/`, `tmp/`, `node_modules/`, `.hermes/`, `.env`, `.env.*` (while allowing `.env.example`), logs, raw DEM/geospatial formats, and the local uploaded source-map duplicate.
- No `.env*` file exists in the repository tree at audit time.
- No tracked raw DEM/geospatial source format, private-key extension, or secret-shaped token was found by the filename and pattern checks used for this audit.
- The only tracked file above 5 MiB is `public/aerial-1944a.png` (5,384,381 bytes). It is a public image asset, not a secret; its licensing/size remains a release-management concern.
- `DESIGN_TOKENS.md` was returned by a naive filename substring check for `token`; it contains design tokens, not credentials.
- No secrets, tokens, cache, build output, or original DEM were added or modified by this audit.

## 10. Phase 0 decision

**GO, with constraints.** The repository is compatible with an incremental V1.1 engine boundary. Phase 1 may begin only after using the plan in `BATTLEFIELD_V1_1_IMPLEMENTATION_PLAN.md` and retaining these invariants:

1. no rewrite of the current ThreeScene/terrain ownership solution;
2. no casual coordinate-system change;
3. no mutation of canonical Locations or historical source-trace geometry;
4. no promotion of candidate routes or inferred troop positions;
5. no second visitor Three.js scene for a new mode;
6. every new runtime behavior must be driven by validated data/state and covered by deterministic tests.

