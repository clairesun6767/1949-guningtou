# 古寧頭 V1.3 Canonical Diff Snapshot

Baseline: V1.2 commit `00c184a172b04e8dec77679d12aa99b012890cd4`
Current decision: evidence metadata and review artifacts only; no canonical historical entity or protected geometry was changed.

## Counts

| Record | V1.2 | V1.3 | Difference | Result |
| --- | ---: | ---: | ---: | --- |
| Canonical Locations | 6 | 6 | 0 | PASS |
| Canonical Events | 0 | 0 | 0 | PASS |
| Canonical Units | 0 | 0 | 0 | PASS |
| Canonical Routes | 0 | 0 | 0 | PASS |
| Source Registry entries | 38 | 38 | 0 | PASS |
| Historical Claims | 13 | 13 | 0 | PASS |
| Production-enabled historical entities | 0 | 0 | 0 | PASS |
| Evidence Matrix candidates | 5 | 5 | 0 | PASS |
| Research Gaps | 9 | 9 | 0 | PASS |
| Human Review Queue items | 0 | 9 | +9 | EXPECTED review artifact |

## Protected surface

The V1.3 diff must not include edits to:

- canonical `locations.geojson`
- terrain or coastline assets
- `battle-movements.geojson`
- `routes.geojson` or any existing route geometry
- `historical-battle-map-traces.geojson`
- historical coordinates or renderer/engine implementation

The only historical package change is the addition of audit metadata and the package reference to the human-review queue. `events.json`, `units.json`, and `routes.geojson` remain empty, so no production vertical slice can be enabled by accident.
