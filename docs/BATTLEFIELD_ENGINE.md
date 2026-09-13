# Battlefield Engine — V1.1 P0 Boundary

## Implemented modules

| Module | Responsibility | Renderer dependency |
| --- | --- | --- |
| `BattlefieldState.ts` | Single state shape, reducer, and external-store container | None |
| `TimelineEngine.ts` | Deterministic play/pause/seek/speed clock and subscription | None |
| `EventEngine.ts` | Active interval queries and enter/exit transitions | None |
| `UnitSystem.ts` | Visibility, spawn/hide overrides, route interpolation, research gating | None |
| `CameraDirector.ts` | Orbit/fly-to/follow/look-at/cinematic/free-explore command orchestration | Port only |
| `BattlefieldEngine.ts` | Composes the systems and synchronizes derived state | None |
| `dataAdapter.ts` | Maps the current package into source-aware runtime records | None |

Public exports are consolidated in `src/battle-replay/runtime/index.ts` and re-exported by `src/battle-replay/index.ts`.

## State contract

```ts
{
  currentTime,
  mode,
  researchMode,
  activeEvents,
  visibleUnits,
  selectedPOI,
  selectedRegion,
  cameraState,
}
```

`BattlefieldEngine` owns the timeline, event, unit, camera, and state services. A React host subscribes to snapshots; it does not own a second per-frame simulation clock.

## One vertical slice contract

The runtime test proves this renderer-neutral sequence using synthetic, clearly marked data:

```text
seek time
  -> EventEngine activates events
  -> UnitSystem exposes a verified test route and interpolated position
  -> CameraDirector delegates a fly-to command
  -> BattlefieldState selects a POI
  -> story data returns text narration
  -> research mode reveals research-only test data
```

This is a test harness, not a historical claim. The current formal Guningtou package has no typed event/unit/route record that passes the required evidence gate, so no production historical vertical slice was invented.

## Adapter boundary

`dataAdapter.ts` preserves source IDs, evidence IDs, source confidence, verification status, coordinate/geometry provenance, route nature/type, and notes. It only maps in memory. Existing visualization adapters continue to handle movement corridors, attack axes, and schematic source traces as their established presentation layers.

## Verification

- Runtime contract tests are in `tests/battle-replay/runtime.test.mjs`.
- Synthetic fixtures are in `tests/fixtures/battlefield-runtime-fixtures.mjs` and are marked `NON_HISTORICAL_TEST_DATA`.
- The runtime modules contain no Three.js or Cesium imports.
- The existing map playback uses `BattlefieldEngine` for normalized time/research/POI state while retaining the current terrain and visual layers.
