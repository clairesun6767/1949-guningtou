# Guningtou Battle Movement Data V0.6

## Canonical separation

Historical movement interpretation is stored in `data/battles/guningtou-1949/battle-movements.geojson`. It is not mixed with modern OSM cartography and it does not alter the semantics of canonical `routes.geojson`.

## Required properties

Each feature contains:

- stable `id` and WGS84 GeoJSON `geometry`;
- `movementType`: `VERIFIED_ROUTE`, `MOVEMENT_CORRIDOR`, `ATTACK_AXIS`, or `RESEARCH_ONLY`;
- date-level `timeRange`;
- known `side`;
- explicit `confidence`;
- `sourceIds`, `evidenceIds`, and `relatedLocations`;
- `geometryProvenance`: `surveyed`, `source_traced`, `human_interpreted`, or `approximate_axis`;
- a human-readable provenance note;
- `reviewStatus`: `draft`, `reviewed`, `approved`, or `rejected`;
- production/research visibility and a precision disclaimer.

Production features must be `approved`. Research-only geometry cannot enter visitor mode. A verified route additionally requires verified confidence and verified route status.

## Feature register

| Feature | Date | Geometry | Type | Side | Confidence | Provenance | Review |
| --- | --- | --- | --- | --- | --- | --- | --- |
| MOV-GUN-1025-PLA-LANDING-AXIS | 10/25 | LineString broad arrow | ATTACK_AXIS | PLA | approximate | approximate_axis | approved |
| MOV-GUN-1025-PLA-INLAND-CORRIDOR | 10/25 | Polygon | MOVEMENT_CORRIDOR | PLA | approximate | human_interpreted | approved |
| MOV-GUN-1026-ROC-COUNTERATTACK-AXIS | 10/26 | LineString broad arrow | ATTACK_AXIS | ROC | probable | approximate_axis | approved |
| MOV-GUN-1026-PLA-NORTH-RETREAT-CORRIDOR | 10/26 | Polygon | MOVEMENT_CORRIDOR | PLA | probable | human_interpreted | approved |
| MOV-R01-ANQI-BEISHAN-RESEARCH | 10/25 | source-traced LineString | RESEARCH_ONLY | unknown | interpretive | source_traced | reviewed |

10/27 intentionally displays no approved movement geometry. The timeline still communicates the northern endgame, while refusing to convert an outcome statement into a false movement path.

## Runtime mapping

`movementCollectionToMapFeatures` maps corridors to the shared `corridor` primitive, axes to `direction`, and verified/research lines to `route`. The existing layer and timeline engine then controls visitor/research visibility. The Three layer samples local DEM elevation and adds a small stable offset; attack axes use slow breathing only when reduced motion is not requested.
