# Battlefield_OS — V1.1 Implementation Plan

## Plan metadata

- Plan date: 2026-09-13
- Baseline: `a8774e2becb4fa7f998e890bfb14a8b1efaf3372`
- Baseline branch: `main`
- Development branch required by the execution spec: `feature/battlefield-engine`
- Current phase: Phase 8 synthetic vertical slice complete; formal historical slice awaits an evidence-gated event/unit/route
- Scope rule: preserve the existing site and V0.8.x rendering/data invariants, then add the smallest compatible engine boundary

This plan is derived from the current repository audit in `docs/CURRENT_ARCHITECTURE_AUDIT.md`. It deliberately uses adapters and extraction before new runtime modules. It does not authorize rewriting historical data, canonical Locations, terrain assets, coordinate conversion, or source-traced battle geometry.

## 1. Existing Components to Preserve

### Product and deployment

- Astro 7 static output, GitHub Pages base `/1949-guningtou/`, three locale routes, existing Pages workflows, and the museum shell/design tokens.
- Existing page information architecture, search, language switcher, content pages, source citations, and legacy Leaflet/reference paths.

### Historical data and validation

- `data/battles/guningtou-1949/` package and its manifest.
- Canonical six-feature `locations.geojson` exactly as committed at the baseline.
- Empty canonical `routes.geojson`; do not fabricate or promote routes to make the vertical slice look complete.
- Existing `battle-movements.geojson`, `historical-battle-map-traces.geojson`, `historical-battle-phases.json`, registration metadata, evidence, source IDs, confidence, provenance, visitor labels, and research-only flags.
- `src/battle-replay/types`, `validation`, legacy adapter, coordinate services, GeoJSON round-trip, route editing, and historical trace semantic helpers.

### Stable visual runtime

- One Three.js world in `ThreeScene` with regional terrain retained while the local patch is mixed in.
- `ThreeTerrainController` terrain ownership, coverage mask, classification shader, texture filtering controls, and disposal.
- `ThreeCartographicLayer`, `ThreeBattleMovementLayer`, `ThreeHistoricalTraceLayer`, `ThreePoiLayer`, CSS2D labels, and `ThreeCameraController`.
- Current ocean/background fix, 45° camera behavior, base-path asset loading, and all V0.8.1 classification isolation QA modes.

## 2. Components to Refactor

| Component | Refactor boundary | Compatibility rule |
| --- | --- | --- |
| `HistoricalMapExperience.tsx` | Move playback clock calculations, active event derivation, and unit state derivation behind runtime services; retain UI, locale copy, layer controls, and existing route | React may subscribe to snapshots; it must not become the per-frame simulation owner |
| `src/battle-replay/visualization/engine.ts` | Keep feature validation/date/layer gating; make it a presentation adapter over state rather than a second battle-state store | Existing function signatures and route gating tests remain valid |
| `ThreeCameraController.ts` | Add a thin command bridge for `CameraDirector` | OrbitControls and current presets remain the only Three camera implementation |
| `ThreeBattleMovementLayer.ts` / `ThreeHistoricalTraceLayer.ts` | Consume derived render snapshots, not historical assertions or raw timeline logic | No new geometry from unsupported routes or positions |
| Legacy data adapter | Normalize existing JSON into a versioned runtime input with explicit source/confidence/unknown fields | Keep source IDs and unresolved values; never silently upgrade confidence |
| `HistoricalBattleMapRegistrationEditor.tsx` | Optional later adapter to save reviewed exports into the formal data-review workflow | Browser draft/export behavior and canonical source files remain unchanged until a human replaces them |

## 3. New Components Required

Add only after the audit documents are committed and the compatibility checks remain green. Use a renderer-neutral namespace under `src/battle-replay/runtime/` to avoid duplicating the existing visualization engine.

### P0 runtime boundary

1. `runtime/types.ts` — `BattlefieldMode`, `BattlefieldState`, `BattlefieldAction`, runtime snapshots, and source-aware render intents.
2. `runtime/BattlefieldState.ts` — single state container/reducer with `currentTime`, `mode`, `activeEvents`, `visibleUnits`, `selectedPOI`, `selectedRegion`, and `cameraState`.
3. `runtime/TimelineEngine.ts` — deterministic clock with `play()`, `pause()`, `seek(time)`, `setSpeed(speed)`, `getCurrentTime()`, `subscribe(listener)`, and an injectable time source for tests.
4. `runtime/EventEngine.ts` — pure event interval queries and enter/exit crossing detection. It emits domain commands, never imports Three.js or mutates a scene.
5. `runtime/UnitSystem.ts` — unit records, visibility, spawn/hide, route interpolation, timeline state, and confidence/provenance gating. A unit without a reviewed position must remain unknown/hidden rather than receive an invented coordinate.
6. `runtime/CameraDirector.ts` — renderer-neutral `orbit`, `flyTo`, `follow`, `lookAt`, `cinematicPath`, `freeExplore`, `play`, `interrupt`, `resume`, and `cancel` commands; the first adapter delegates to the existing Three camera controller.
7. `runtime/BattlefieldEngine.ts` — composes the systems, synchronizes derived state, and exposes the renderer-neutral vertical-slice boundary.
8. `runtime/dataAdapter.ts` — maps the current battle package and legacy data into runtime inputs without changing source files.
9. `runtime/index.ts` — one public runtime entry point for the React island and future renderers.

### P1 scaffolding (do not expand in the first vertical slice)

- `RegionManager` with typed region metadata for WORLD, GUNINGTOU, LONGKOU, BEISHAN, NANSHAN, LINCUO, and COAST; no streaming requirement yet.
- `AssetManager` with base-path-safe manifest entries and lazy loading; no duplicate image/terrain cache.
- Story-data adapter over existing scene/narrative data; no hard-coded story sequence in ThreeScene.

## 4. Data Migration and evidence policy

1. Do not edit `locations.geojson`, `routes.geojson`, terrain assets, classification PNGs, or source-trace GeoJSON as part of the runtime extraction.
2. Introduce runtime types that accept the existing field names and preserve `sourceIds`, `evidenceIds`, `confidence`, `reviewStatus`, `geometryProvenance`, `provenanceNote`, `researchOnly`, and unknown values.
3. Treat the current `battle-movements.geojson` as approximate/probable visual interpretation, not as verified route truth. Keep it in a movement/area layer.
4. Treat `historical-battle-map-traces.geojson` as `source_traced + schematic_only`; keep `sourceMapId`, `sourceImage`, `visitorLabel`, `sourceLabel`, registration status, and source graphic references intact.
5. Keep legacy `data/*.json` as the historical input catalog. The adapter may resolve IDs and normalize time intervals in memory; it must not overwrite legacy records.
6. Add only `NON_HISTORICAL_TEST_DATA` fixtures under `tests/fixtures/` for clock/event/unit tests. Test fixtures must be impossible to confuse with the formal historical package and must never be imported by the visitor build.
7. A future reviewed route migration requires a human decision, source references, time precision, unit binding where supported, a confidence/status change, and validator coverage. It is outside the first runtime extraction.

## 5. Risks and mitigations

| Risk | Level | Mitigation / stop condition |
| --- | --- | --- |
| Unsupported historical route becomes a moving unit | Critical | UnitSystem rejects missing reviewed position/route; production route gate remains unchanged |
| Coordinate regression | Critical | Keep `wgs84ToLocalMeters` and add exact regression tests for all six canonical Locations |
| Terrain flicker/long-strip regression | Critical | Phase 1 control capture, classification QA modes, no terrain ownership rewrite, browser interaction smoke |
| React and renderer clocks diverge | High | TimelineEngine is the single source of current time; renderer receives snapshots/imperative updates only |
| Different FPS changes event results | High | EventEngine uses interval crossing against explicit previous/current time; seek reconstructs deterministically |
| Camera commands create a second animation system | High | CameraDirector delegates to `ThreeCameraController`; no new direct `camera.position` writes in UI components |
| Mobile GPU and bundle cost | High | Keep Three lazy, use existing compact/mobile quality paths, measure before increasing geometry/assets |
| Modern terrain read as 1949 truth | High | Preserve modern-reference labels and source/era fields in state and UI |
| Historical source map is treated as precise GIS | Critical | Keep registration `schematic_only`, anchors 0, transform none, and all disclaimers |
| Shared state scope grows into a rewrite | Medium | Start with pure services and an adapter; do not replace nanostores/site shell in P0 |

## 6. Dependencies

### Existing dependencies to use

- TypeScript strict mode and current battle-replay compiler project.
- Node built-in test runner used by `tests/battle-replay/*.test.mjs`.
- Three.js 0.185.1 and existing controls/renderers.
- Astro/React/React DOM and existing CSS token system.

### New dependencies

**None required for P0.** Do not add a schema library, state library, animation library, or second renderer until the pure runtime contracts demonstrate a need. If a future E2E/performance harness is added, it must be justified in a separate commit and must not change production history data.

## 7. P0 task sequence

### Phase 0 — Audit (complete)

- Repository and Git safety scan.
- Current architecture, asset, deployment, data, route, coordinate, security, and known-bug audit.
- Baseline validation/tests/typecheck/build.
- Create `CURRENT_ARCHITECTURE_AUDIT.md` and this plan.

### Phase 0.5 — Git safety (complete)

- Verify the audit-only diff.
- Create `feature/battlefield-engine` only if it does not already exist; never overwrite an existing branch.
- Preserve `main` as the deployed baseline.

### Phase 1 — Existing visual integrity (complete)

- Verify strategic, Kinmen, Guningtou, landing-coast, battle-overview, and mobile presets.
- Run continuous zoom, orbit, and pan smoke checks at the current production-like page.
- Record ocean/world boundary, terrain seam, local ownership, POI, camera, mobile, console, and long-strip status.
- Keep `terrain-solid` as the control sample and do not change the terrain solution unless a reproducible failure is found.

### Phase 2 — Data layer (complete)

- Define runtime input types and the historical evidence boundary.
- Add pure adapters for POI/event/unit/route/source/region/story input.
- Add tests for confidence/status gating, source preservation, unknown values, and no candidate-route leakage.

### Phase 3 — Battlefield state (complete)

- Introduce the single state shape and reducer/action model.
- Bridge current selected POI, selected region, mode, active date, and visible feature derivation without changing the visitor UI.

### Phase 4 — Timeline (complete)

- Implement and test TimelineEngine API: play, pause, seek, speed, current time, subscribe.
- Replace the local clock path only after the compatibility adapter proves identical current behavior.

### Phase 5 — Event (complete)

- Implement deterministic active/enter/exit event queries.
- Connect event snapshots to state and existing narrative/label opportunities; no direct Three.js calls.

### Phase 6 — Unit (complete in synthetic fixture; formal unit data remains empty)

- Implement UnitSystem and route interpolation against test-only `NON_HISTORICAL_TEST_DATA` first.
- Do not assign a historical unit a coordinate unless the source-backed data already contains it and validator checks pass.

### Phase 7 — Camera (contract complete; Three adapter follow-up)

- Add CameraDirector commands and the Three adapter.
- Demonstrate fly-to and free-explore interruption/cancellation using existing camera presets and a canonical POI, without changing coordinate conversion.

### Phase 8 — Vertical slice (synthetic slice complete; historical evidence gate partial)

- Select a candidate event only from the current evidence inventory. If no event passes the evidence gate, ship a clearly marked test fixture demo and record the blocker rather than inventing history.
- Demonstrate: open battlefield → seek → event activation → test/approved unit visibility → route interpolation → camera command → POI selection → narration/state output → return to explore.

### Regression and documentation

- Run validation, battle tests, typecheck, build, and the Phase 1 browser smoke suite.
- Produce/update the V1.1 documentation set only with measured PASS/PARTIAL/FAIL/NOT AVAILABLE evidence.

## 8. Acceptance criteria

### Existing site and visual integrity

- Astro static build and all three language routes remain available.
- Existing terrain, local coverage ownership, POIs, classification controls, historical source traces, and GitHub Pages base path remain intact.
- No terrain flicker or long-strip regression in `terrain-solid` control and normal production configuration.
- Normal explore cameras do not expose an unexplained ocean/world hard boundary; any remaining limitation is documented with a reproducible viewport/camera state.

### Architecture and evidence

- Historical data is separated from rendering through typed runtime adapters.
- A single BattlefieldState exists; Three.js consumes derived render state and does not interpret historical assertions.
- Source/confidence/evidence/notes survive every adapter boundary.
- Candidate/no-evidence routes cannot appear in visitor production mode.

### Timeline, events, units, camera

- TimelineEngine passes play/pause/seek/speed/subscribe tests and is deterministic under injected time.
- EventEngine passes active/enter/exit tests and does not import Three.js.
- UnitSystem supports spawn/hide/position/interpolation in a test fixture; historical unknown positions remain unknown.
- CameraDirector passes fly-to/free-explore/interrupt/cancel tests and delegates to existing camera presets/controller.

### Vertical slice and compatibility

- One evidence-gated or clearly marked non-historical test vertical slice passes without contaminating the formal data package.
- Desktop/laptop/mobile smoke checks pass, including no critical console errors and no broken base-path assets.
- `validate:battle-data`, `test:battle-data`, `typecheck`, and `build` pass.

## 9. Commit plan

1. `docs: audit current battlefield architecture for v1.1` — audit, coordinate, and performance baseline documents only.
2. `chore: establish battlefield engine compatibility branch` — branch metadata/checklist if required; no production behavior changes.
3. `fix: preserve existing visual integrity under v1.1 runtime boundary` — only reproducible Phase 1 boundary fixes, with regression tests.
4. `feat: add evidence-aware battlefield runtime state` — runtime types, state, adapters, and tests; no visitor geometry invention.
5. `feat: add deterministic timeline event unit and camera systems` — pure systems and renderer bridge, with test fixture only.
6. `feat: prove one battlefield vertical slice` — minimal UI bridge and evidence/test disclosure.
7. `docs: record v1.1 acceptance and operational boundaries` — final reports, README/PROJECT/CHANGELOG updates, and final Git audit.

Each commit must keep the working tree reviewable, run the relevant tests, and avoid force-pushing or rewriting `main`.

## 10. Definition of done for this plan

The plan is complete only when the acceptance criteria above are backed by files and test output. A clean build alone is not sufficient. If an evidence gate or performance measurement is unavailable, record `PARTIAL` or `NOT AVAILABLE` with the blocker; do not replace it with invented historical data or an unmeasured claim.
