# Existing Project Audit

## Audit scope

- Repository: `D:\Hermes\Projects\1949`
- Audit timestamp: 2026-09-15 12:49 (Asia/Taipei)
- Audited branch at hand-off: `feature/2.0-art-region`
- Frozen 1.x commit: `d4eefed59fc8a7fe1754d79b169ef39d8682a2c9`
- Remote: `https://github.com/clairesun6767/1949-guningtou.git`
- Package manager: npm (`package-lock.json`, lockfile version 3)
- Runtime observed: Node `v24.18.0`; project requirement `>=22.12.0`
- Astro: `^7.1.6` (resolved package in the installed dependency tree)
- Three.js: `^0.185.1`; Cesium: `^1.144.0`

## Current Architecture

The production site is a static Astro application with a React integration and Tailwind CSS via Vite. `src/pages/` contains the existing public routes: the language routes under `src/pages/[lang]/`, two development editors, and the root redirect. `src/layouts/MainLayout.astro` owns the 1.x navigation, metadata, fonts, and footer. Content is loaded from the repository's `data/` JSON packages through `src/data/` and typed adapters.

The existing architecture is intentionally evidence-oriented. The battle replay domain is renderer-neutral and lives below `src/battle-replay/`; visitor presentation is composed in `src/components/map/` and the language pages. This is a protected production surface for 1.x and is not imported by the 2.0 art prototype.

## Existing 3D Stack

- Three.js `0.185.x` with `WebGLRenderer`, `OrbitControls`, `CSS2DRenderer`, custom `onBeforeCompile` terrain material code, and renderer-neutral Three adapters.
- Cesium `1.144.x` with a separate viewer, terrain/atmosphere/camera/layer controllers, and static worker/asset copying in `astro.config.mjs`.
- Existing renderer selection is lazy and capability-aware in `HistoricalMapExperience.tsx`; the production map supports an atlas fallback, Three.js, and Cesium.
- Existing 1.x Three modules are in `src/components/map/three/`: scene lifecycle, terrain ownership, cartographic layers, historical trace layers, camera control, and POI layers.
- Existing 1.x controls already map left drag to rotate, middle/right drag to pan, wheel to zoom, and touch gestures to rotate/dolly-pan.

## Existing Terrain Assets

The repository already contains an explicitly derived regional DEM asset:

| Asset | Coverage | Grid | Raw size | Provenance |
| --- | --- | ---: | ---: | --- |
| `public/terrain/kinmen-xiamen-regional.json` | 117.97–118.58 E, 24.34–24.65 N | 196 × 100 | 86,295 B | Mapzen Terrain Tiles / SRTM N24E118; modern elevation reference |
| `public/terrain/guningtou-local.json` | 118.285–118.37 E, 24.44–24.50 N | 320 × 256 | 358,372 B | Same derivation; local 1.x detail asset |

The regional asset has a 345 m derived maximum and 19,600 samples. It is a low-detail strategic silhouette asset, not a 1949 reconstruction. `scripts/build-three-terrain-assets.mjs` documents nearest-neighbour downsampling from 1 arc-second HGT and the runtime vertical exaggeration policy.

## Existing Geographic Data

- `public/map-data/regional-coastline.geojson`: 32 independent OSM land polygons, 66,868 B, regional strategic context.
- `public/map-data/regional-cartography.geojson`: 880 scale-filtered modern reference features, 505,997 B raw; agriculture, forest, settlement, open ground, beach, primary road, and secondary road categories.
- `public/map-data/guningtou-*.geojson` and the local classification masks are higher-detail 1.x visitor-context assets.
- `data/battles/guningtou-1949/` contains canonical battle package data, including locations, events, units, routes, traces, phases, camera cues, claims, and evidence. These files are protected and are not part of the 2.0 Region provider.
- Existing imagery (`public/aerial-1944*.png`, `public/map-data/historical-battle-map.jpg`) is explicitly incomplete or historical-source material. It must not be treated as aligned terrain or silently blended into the Gate A base scene.

## Existing BattlefieldEngine

`src/battle-replay/runtime/BattlefieldEngine.ts` coordinates `BattlefieldState`, `TimelineEngine`, `EventEngine`, and `UnitSystem` through typed adapters. The engine deliberately keeps unsupported historical entities out of visitor mode and preserves evidence/confidence boundaries. Current validation reports zero promoted canonical routes and a blocked formal historical vertical slice. The 2.0 Gate A does not instantiate, extend, or modify this engine; the Region prototype only exposes geographic camera presets and a clearly labelled placeholder transition into WS2.

## Existing Reusable Components

Reusable by concept, but not imported directly by 2.0 runtime code:

- `ThreeCameraController` interaction conventions and WGS84-to-local tangent-plane approach.
- Regional DEM and regional coastline assets listed above.
- Regional semantic classification masks as optional art-direction material inputs.
- Existing CSS2D label technique and the current museum type tokens as visual references.
- Existing WebGL capability detection and the established base-path requirement (`/1949-guningtou`).

The Gate A implementation re-expresses these concerns under `v2/` so its scene lifecycle, configuration, data provider, and performance instrumentation remain auditable in isolation.

## Protected 1.x Surfaces

- `main`, `feature/battlefield-engine`, `v1.3-frozen`, and all previous tags/history.
- `src/pages/[lang]/` and the existing root/dev routes.
- `src/battle-replay/` canonical types, runtime engine, validators, adapters, and tests.
- `data/`, especially `data/battles/guningtou-1949/`, canonical historical claims, routes, locations, and evidence records.
- Existing `public/terrain`, `public/map-data`, and 1.x historical imagery are not rewritten for visual effect.
- `astro.config.mjs` static-copy rules for Cesium and 1.x research assets.

## Candidate Assets Reusable in 2.0

1. `kinmen-xiamen-regional.json` for the Gate A elevation silhouette.
2. `regional-coastline.geojson` for coast readability and land masking.
3. `regional-classification-a.png` and `regional-classification-b.png` as optional modern-reference material masks.
4. Existing public attribution text for OSM and Mapzen/SRTM.

These are reused as read-only modern geographic references. They do not carry battle events or historical route claims.

## Assets That Should NOT Be Reused

- Local Guningtou high-detail assets as the initial regional scene: they bias the camera toward WS2 and duplicate payload.
- Canonical battle routes, movement traces, timeline phases, unit data, or evidence records in the Region renderer.
- `historical-battle-map.jpg` or `aerial-1944*.png` as a terrain texture: current repository QA marks imagery georeferencing as incomplete.
- Any AI-generated terrain image, offline render, composited screenshot, or unverified external map tile.
- 1.x `BattlefieldEngine` runtime state as a hidden data source for the 2.0 entry point.

## Risks

1. The regional DEM is deliberately coarse; excessive zoom would expose its resolution, so Gate A needs hard camera bounds.
2. OSM coastline and classification data are modern reference data, not 1949 land use. UI and report language must keep that distinction visible.
3. Browser WebGL availability, device pixel ratio, and mobile GPU limits can change frame rate substantially.
4. The current Astro build includes 279 1.x pages; any import from `v2/` into existing pages could increase the production graph or blur the isolation boundary.
5. The GitHub Pages base path must be included in every runtime asset URL.

## Recommended 2.0 Isolation Strategy

1. Keep all Gate A source under `v2/`, split into `app`, `config`, `shared`, and `prototypes/region` modules.
2. Add only a thin `src/pages/v2/region.astro` entry that renders the new React island; do not change 1.x layouts or routes.
3. Make `RegionDataProvider` the only runtime source for regional JSON and mask assets.
4. Keep camera constraints, performance tiers, debug toggles, and visual variants in Region-local configuration.
5. Test pure contracts from `v2/` separately, then rerun the unchanged 1.x validation/tests/typecheck/build suite.
6. Do not begin WS2–WS4 implementation until a human explicitly approves Gate A.
