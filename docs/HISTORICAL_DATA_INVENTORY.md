# 古寧頭 Historical Data Inventory — V1.2

盤點日期：2026-09-13
範圍：Repository 內既有 `data/`、`src/`、`public/`、`docs/`、`tests/` 與歷史地圖／路線相關檔案。
原則：只整理 repository 既有材料；不以檔名、座標鄰近、圖形相似或一般歷史知識自動升級證據等級。

## Entity inventory

| Entity | Existing Source | Format | Coordinates | Time | Source Citation | Confidence | Canonical Ready |
| --- | --- | --- | --- | --- | --- | --- | --- |
| POI | `data/poi.json` (25 legacy POIs); `data/battles/guningtou-1949/locations.geojson` (6 package Locations) | JSON / GeoJSON | Legacy coordinates are mixed `Exact`/`Estimated`/`Approximate`; package uses six WGS84 Point records with existing provenance | POI records are not event intervals | `related_sources` on legacy POIs; package Locations retain `SRC-0001` | Legacy evidence A/C; package confidence `confirmed` or `probable` | **Partial** — six canonical records are schema-valid, but several are area-only or identity-pending |
| EVENT | `data/events.json` (30); `data/timeline.json` (123 related records) | JSON | Mostly free-text locations; no stable package bindings | Dates/ranges exist, often day/hour precision | `source_ids` commonly `SRC-0004`, `SRC-0027`; no page/excerpt fields in most records | `verified`, `partially_verified`, and `conflicting_sources` are all present | **No** — package `events.json` remains empty; stable location/unit/evidence links are incomplete |
| UNIT | `data/unit_index.json` (25 legacy units); `data/prc/*` adds draft PLA OOB/personnel vocabulary | JSON | No canonical position in legacy unit index | No unit temporal extent in the legacy index | `related_sources` and `related_events` are empty in the unit index | Not assigned in legacy unit index; event free text is only a candidate binding | **No** — package `units.json` remains empty; identity and event participation need direct citations |
| ROUTE | `data/route_database.json` (36 POI/topology relations); Route Audit R01–R12; package `routes.geojson` | JSON / Markdown / GeoJSON | No canonical route geometry; historical traces are separate schematic interpretation | Candidate time windows are mixed or absent | Route Audit cites legacy event/source context; no route-specific page/excerpt for a promoted route | `PARTIALLY_SUPPORTED` 9; `NO_EVIDENCE` 3; `SUPPORTED` 0 | **No** — formal route collection is empty and all audit mappings are disabled |
| SOURCE | `data/sources.json` (38) | JSON | N/A | Publication dates are partial | Bibliographic fields, URLs, archive/catalog pointers | Source availability/status is preserved; claim support is separate | **Yes as registry** — typed adapter validates unique IDs; not evidence by itself |
| REGION | `data/battles/guningtou-1949/battle-areas.geojson` (0); four polygon traces in the schematic source-map collection; interactive map-focus fields | GeoJSON / JSON | No canonical historical region geometry | Phase/date context exists, but no boundary time model | Source-map trace references `IMG-HIST-GUN-ROUTE-001`; event/region claims remain separate | Mostly `PARTIAL`/`needs_human_review` | **No** — no source-backed canonical region boundary |
| TIMELINE | `data/timeline.json` (123); `data/interactive_timeline.json` (12 segments); `data/prc/pla_timeline.json` (13 draft entries) | JSON | Location and unit fields are mostly free text | Mixed day/hour/approximate ranges | Legacy source IDs on ROC-oriented records; PRC draft entries do not consistently carry source IDs | C/A/E and draft statuses are preserved | **Partial** — useful ordering/context, not a canonical replay timeline |
| MEDIA | Package `media.json` is empty; `public/` contains derived aerial, map, terrain and classification assets; trace/registration metadata references source graphics | JSON / PNG / JPG / GeoJSON | Some imagery has bounds metadata; historical map is not georeferenced for production | Capture/publication timing is incomplete | Media and imagery metadata retain source/rights fields where present | Asset availability does not prove historical content | **Partial** — presentation assets exist; evidence and rights review remain separate |

## Repository counts

| Dataset | Count / current state |
| --- | ---: |
| Legacy sources | 38 |
| Legacy events | 30 |
| Legacy timeline records | 123 |
| Legacy POIs | 25 |
| Legacy units | 25 |
| Interactive timeline segments | 12 |
| PRC draft timeline entries | 13 |
| Route database relationships | 36 |
| Canonical package Locations | 6 |
| Canonical package Events | 0 |
| Canonical package Units | 0 |
| Canonical package Routes | 0 |
| Historical source-map traces | 13 (schematic-only) |
| Canonical battle areas | 0 |

## Canonical package boundary

The existing `data/battles/guningtou-1949/` package remains the destination for explicitly reviewed canonical entities. V1.2 adds only evidence-management records to the same package:

- `historical-claims.json` — 13 explicit claims, all source-linked and conservatively graded.
- `evidence-matrix.json` — 5 historical event candidates and dimension-by-dimension Gate status.
- `route-audit.json` — R01–R12 status mapping; original candidates are retained but not enabled.
- `research-gaps.json` — 9 open/blocked questions that prevent promotion.

No legacy event, unit, candidate route, terrain, canonical Location coordinate, battle movement, or source trace was silently promoted by this inventory.

## Inventory decision

The first candidate with the strongest current event/time record is `EVT-0008` (胡璉抵達金門接掌指揮權). Its Location and Unit dimensions remain `PARTIAL`, and no canonical Event/Unit records exist in the package. Therefore no candidate currently satisfies the V1.2 production Evidence Gate.
