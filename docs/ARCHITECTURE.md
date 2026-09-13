# 1949 Guningtou Battlefield Architecture

## Status

This document records the compatible V1.1 architecture boundary as of 2026-09-13. The implementation is incremental: the existing Astro site and Three.js world remain the product surface, while the renderer-neutral battlefield runtime is introduced underneath the existing map island.

## Current product layers

```text
Astro static pages / locale routes
        |
React map island: HistoricalMapExperience
        |
Battlefield runtime boundary
  BattlefieldEngine
    |- BattlefieldState / BattlefieldStore
    |- TimelineEngine
    |- EventEngine
    |- UnitSystem
    |- CameraDirector
    |- dataAdapter
        |
Presentation adapters
  ThreeScene + terrain/cartography/battle layers
  CesiumScene adapter
  Atlas fallback
```

The runtime contains historical meaning only as typed, source-aware input. Three.js and Cesium consume derived state or existing presentation features; they do not create historical assertions.

## Compatibility rules

- One shared battlefield world is retained across Explore, Story, and Battlefield modes.
- The current terrain ownership, classification, ocean, camera presets, POIs, source traces, and base-path asset loading are preserved.
- `data/battles/guningtou-1949/` remains the historical input package. Runtime adapters normalize values in memory and never rewrite source JSON.
- Candidate, estimated, disputed, or unknown geometry remains gated from visitor production mode.
- No canonical Location, route, event, unit, terrain asset, coordinate system, or source-trace record is invented by the runtime extraction.

## Runtime state flow

```text
TimelineEngine time
        |
        v
EventEngine -> active / entered / exited events
        |
        v
UnitSystem -> visible unit snapshots and route interpolation
        |
        v
BattlefieldStore -> currentTime, mode, researchMode, selections, camera state
        |
        v
Renderer adapter -> Three.js / Cesium / Atlas presentation
```

`BattlefieldEngine` is the orchestration boundary. It has no DOM, React, Three.js, or Cesium import. The camera port is the only renderer-facing dependency.

## Existing map integration

`HistoricalMapExperience` now uses the runtime engine for the normalized playback clock, research-mode state, and selected POI state. Existing battle movement and historical source-trace presentation remains in its established visualization adapters. The formal canonical package currently has empty typed `events`, `units`, and `routes`; therefore the production runtime passes an empty value for those collections rather than fabricating a slice.

The existing Three camera controller and `fitBattleMovement` behavior remain the visual camera implementation. `CameraDirector` provides the renderer-neutral command contract and is validated with a port-level test; wiring additional cinematic commands to the existing controller is a later compatible adapter task.

## P1 boundaries

`RegionManager`, `AssetManager` expansion, advanced Story Mode, streaming/LOD work, AI context providers, and large-scale simulation remain backlog items. They are not prerequisites for the P0 data/state/timeline/event/unit/camera contracts.
