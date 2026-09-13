# Battlefield V1.1 Acceptance Report

Date: 2026-09-13  
Baseline: `a8774e2becb4fa7f998e890bfb14a8b1efaf3372`  
Branch: `feature/battlefield-engine`

| Requirement | Status | Evidence | Files / test | Notes |
| --- | --- | --- | --- | --- |
| Existing Astro site remains available | PASS | Static build completed | `npm run build` | No page architecture rewrite |
| Existing terrain retained | PASS | terrain-solid initialized in browser with no long strip observed | `docs/PERFORMANCE_BASELINE.md` | Terrain ownership was not changed |
| Existing canonical POIs retained | PASS | Six canonical Location records remain unchanged | `data/battles/guningtou-1949/locations.geojson` | Runtime maps them in memory |
| Three locales retained | PASS | Build emits locale routes | `README.md`, build output | zh-tw, zh-cn, en retained |
| Existing deployment/base path retained | PASS | Astro config and Pages workflow unchanged | `astro.config.mjs`, `.github/workflows/` | `/1949-guningtou/` preserved |
| No terrain flicker/long-strip regression in control | PASS | Local terrain-solid interactive smoke had ready renderer, 1 canvas, no console errors | browser QA notes | Continuous full production FPS harness remains unavailable |
| Ocean/world boundary baseline retained | PASS | Existing ocean/background fix remains in baseline | `docs/CURRENT_ARCHITECTURE_AUDIT.md` | No boundary rewrite in this phase |
| Historical data separated from rendering | PASS | Runtime adapter and renderer-neutral modules contain no renderer import | `src/battle-replay/runtime/` | Source fields survive mapping |
| Battlefield Engine boundary exists | PASS | Systems composed by `BattlefieldEngine` | `docs/BATTLEFIELD_ENGINE.md` | P1 Region/Asset managers remain backlog |
| Single BattlefieldState exists | PASS | Reducer/store and engine synchronization implemented | `BattlefieldState.ts`, runtime tests | Includes required fields plus researchMode |
| Source/confidence/evidence model preserved | PASS | Adapter maps confidence and provenance without upgrade | `dataAdapter.ts` | Covered by adapter test |
| Candidate routes gated from visitor mode | PASS | Unreviewed route remains research-only | `runtime.test.mjs`, existing route tests | No formal route was added |
| Timeline play/pause/seek/speed/subscribe | PASS | Deterministic tests and map integration | `TimelineEngine.ts`, runtime tests | Clock uses normalized 0–1 playback range in map |
| Event activation and enter/exit | PASS | Transition test covers overlap and exit | `EventEngine.ts`, runtime tests | Formal package currently has no typed events |
| Unit spawn/hide/interpolation | PASS | Synthetic verified route test | `UnitSystem.ts`, runtime tests | Formal package currently has no typed units/routes |
| Camera FlyTo/FreeExplore/interrupt/cancel | PASS | Port delegation test | `CameraDirector.ts`, runtime tests | Existing visual preset controller remains intact |
| One vertical slice | PARTIAL | Synthetic sequence passes; historical evidence gate is empty | `VERTICAL_SLICE_REPORT.md` | No historical facts or route were invented |
| Desktop/laptop/mobile compatibility | PARTIAL | Existing mobile contract and local browser smoke pass | `historical-map-visualization.test.mjs` | Full device matrix measurement is still a follow-up |
| Validation | PASS | 0 validation errors | `npm run validate:battle-data` | Existing calibration warnings remain documented |
| Tests | PASS | 62/62 Node tests pass | `npm run test:battle-data` | Includes new runtime tests |
| Typecheck | PASS | 0 errors/warnings/hints | `npm run typecheck` | — |
| Production build | PASS | Astro static build completes | `npm run build` | Large chunk warning remains baseline and documented |
| Historical production slice | NOT APPLICABLE | No evidence-gated event/unit/route exists | `VERTICAL_SLICE_REPORT.md` | Requires human evidence decision |
