# Changelog

## Unreleased — V1.3 Historical Evidence Closure

- Reviewed all nine V1.2 research gaps using repository evidence only and added a machine-readable human-review queue.
- Added versioned Evidence Matrix audit fields and production traceability validation without promoting historical entities or routes.
- Correctly preserved the Historical Evidence Gate as `BLOCKED`; no production historical vertical slice or synthetic-data promotion was introduced.

## Unreleased — V1.2 Historical Evidence Boundary

- Added the typed Source Registry view, HistoricalClaim model, Evidence Matrix, Route Audit migration map, Research Gap backlog, and HistoricalDataValidator.
- Preserved legacy source IDs and candidate route records without promoting unsupported events, units, locations, or routes.
- Confirmed that no current candidate satisfies the production Historical Evidence Gate; the V1.1 synthetic slice remains test-only.

## Unreleased — V1.1 P0

- Added the renderer-neutral `BattlefieldEngine` boundary with centralized state, timeline, event, unit, camera, and evidence-aware adapter services.
- Replaced the map island's local playback clock and selected-POI/research state with the runtime engine while preserving the existing presentation layers.
- Added synthetic `NON_HISTORICAL_TEST_DATA` runtime tests and documented the formal historical evidence gate.
- Added the V1.1 architecture, schema, vertical-slice, acceptance, and project-status documents.
- Historical data, canonical Locations, terrain, source traces, and battle movement files were not modified.
