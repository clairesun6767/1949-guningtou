# 1949 Guningtou Battlefield — Project Status

## Current phase

V1.1 P0 runtime boundary and compatibility integration.

## Progress

- Phase 0 audit: complete.
- Phase 0.5 Git safety: complete; work is isolated on `feature/battlefield-engine`.
- Phase 1 visual integrity: control smoke complete; no terrain ownership change required.
- Phase 2 data boundary: complete for typed in-memory adapter and evidence gating.
- Phase 3–7 runtime contracts: complete in renderer-neutral modules and tests.
- Phase 8 vertical slice: synthetic test slice complete; formal historical slice is blocked by the evidence gate.

## Completed

- Current architecture, coordinate, performance, and implementation plan documents.
- `BattlefieldState`, `BattlefieldEngine`, `TimelineEngine`, `EventEngine`, `UnitSystem`, `CameraDirector`, and package adapter.
- Existing map playback clock/research/POI state bridged through the runtime engine without changing terrain or historical files.
- `NON_HISTORICAL_TEST_DATA` fixture and runtime contract tests.

## Blockers

The formal package currently has no typed event, unit, or canonical route that can support an evidence-gated historical vertical slice. Existing movement corridors/axes remain approximate presentation geometry and cannot be promoted automatically.

## Next actions

1. Human review selects an evidence-gated candidate event, or explicitly approves a future reviewed data migration.
2. Add a renderer adapter for CameraDirector commands using the existing Three camera controller.
3. Complete the measured desktop/laptop/mobile browser matrix and update the acceptance report.
4. Keep RegionManager, AssetManager expansion, Story Mode, and AI foundation in P1/P2 backlog.

## Recent changes

- Added the renderer-neutral runtime boundary and tests.
- Preserved canonical data, source traces, terrain, classification assets, coordinates, and base-path behavior.
- No `.env`, token, secret, historical JSON, terrain, or route source was added or modified.
