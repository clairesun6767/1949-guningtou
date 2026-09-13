# Changelog

## Unreleased — V1.1 P0

- Added the renderer-neutral `BattlefieldEngine` boundary with centralized state, timeline, event, unit, camera, and evidence-aware adapter services.
- Replaced the map island's local playback clock and selected-POI/research state with the runtime engine while preserving the existing presentation layers.
- Added synthetic `NON_HISTORICAL_TEST_DATA` runtime tests and documented the formal historical evidence gate.
- Added the V1.1 architecture, schema, vertical-slice, acceptance, and project-status documents.
- Historical data, canonical Locations, terrain, source traces, and battle movement files were not modified.
