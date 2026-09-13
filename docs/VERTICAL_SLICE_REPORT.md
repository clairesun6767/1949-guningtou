# V1.1 / V1.2 / V1.3 Vertical Slice Report

## Result

The renderer-neutral vertical slice is **PASS in the synthetic test harness**. The V1.3 evidence closure review leaves the formal historical slice **BLOCKED**, because no repository candidate meets the required Event/Time/Location/Unit threshold without inference.

## Evidence gate

The current `data/battles/guningtou-1949/` package contains an empty typed `events.json`, empty `units.json`, and empty canonical `routes.geojson`. V1.2 adds `historical-claims.json`, `evidence-matrix.json`, `route-audit.json`, and `research-gaps.json` without promoting a legacy record. Existing `battle-movements.geojson` contains reviewed approximate axes/corridors, but those are explicitly not unit routes. The historical source-map traces are schematic-only and are not a substitute for a verified route.

The strongest candidate is legacy `EVT-0008`, but its Location and Unit dimensions remain `PARTIAL`; all five audited candidates are blocked. Consequently, no historical event/unit/route was selected or invented for a production demo. This is an evidence blocker, not a runtime failure. The V1.3 blocked decision is recorded in [`V1_3_BLOCKED_REPORT.md`](V1_3_BLOCKED_REPORT.md).

## Synthetic acceptance flow

`tests/battle-replay/runtime.test.mjs` uses `NON_HISTORICAL_TEST_DATA` and verifies:

1. timeline seek to `25`
2. two event records become active
3. a verified synthetic unit becomes visible
4. its route position interpolates deterministically
5. a camera `fly-to` command reaches a renderer port
6. a POI is selected in `BattlefieldState`
7. text narration is returned from story data
8. research mode reveals the research-only test unit
9. interrupt/cancel returns camera control to free exploration

The test does not import or modify the formal historical package.

## Product integration status

The map island now uses the engine for normalized playback time, play/pause/speed, research-mode state, and POI selection. Existing Three.js terrain, battle movement, source-trace, and camera-preset presentation remains unchanged. No formal route or unit is rendered by the new runtime.

## Next evidence-required action

A historian/reviewer must nominate an existing event with source-backed time, unit, location, and route evidence before a historical vertical slice can be enabled. Until then, the synthetic slice remains test-only.
