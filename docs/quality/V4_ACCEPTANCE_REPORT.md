# Battlefield V4.0 Acceptance Report

Date: 2026-10-19
Branch: `fix/site-content-quality-v4`
Base commit: `d8f98e7b17594cd2191a9f9791a885919b581c21`

| Requirement | Status | Evidence / note |
| --- | --- | --- |
| Independent V4 branch | PASS | `fix/site-content-quality-v4`; no main reset, merge, or force operation |
| Baseline inventory | PASS | [`V4_BASELINE_AUDIT.md`](V4_BASELINE_AUDIT.md), 36/25/30/123/55 records |
| Source Registry integrity | PASS | `data/sources.json` remains authoritative; no duplicate registry |
| Person content presentation | PASS | 36 English presentation records; 35 people show a neutral placeholder pending legal portrait review |
| POI content safety | PASS | The duplicated Housha narrative was removed; unresolved records use explicit review notes |
| POI coordinate revalidation | BLOCKED | 0/25 independently verified; five modern-map candidates require human decision |
| Huwei / Hunan identity separation | PASS | No merge; separate source and review paths retained |
| Historical map audit | PASS | Existing map, terrain, coastline, and trace geometry unchanged |
| Site media audit | PARTIAL | Existing attributed media is catalogued; additional military-site photography remains a research task |
| English event and POI surfaces | PASS | 30 events and 25 POIs have authored presentation copy |
| English timeline | BLOCKED | 123 editorial translations remain pending; no raw Chinese fallback is exposed as English |
| Simplified Chinese | PARTIAL | Explicit UI plus display-layer conversion; independent editorial terminology review remains |
| Historical Evidence Gate | BLOCKED | V1.3 result remains 0 qualified candidates |
| Production Historical Vertical Slice | NOT ENABLED | No unsupported event, unit, route, or coordinate was promoted |
| V4 quality tests | PASS | `npm run test:v4:quality` — 8/8 |
| Battle data validation | PASS | `npm run validate:battle-data`; errors=0, warnings are the existing four GCP/georeference notices |
| Battle regression tests | PASS | `npm run test:battle-data` — 71/71 |
| V2 regression tests | PASS | `npm run test:v2` — 59/59 |
| Typecheck | PASS | `npm run typecheck` — 0 errors |
| Astro static build | PASS | `npm run build` — 286 pages; V4 added no page route |
| Static output/base-path audit | PASS | `npm run audit:v4:static`; five required routes, `/1949-guningtou/` references, no local path or localhost leak |
| Playwright visual acceptance | PASS | 12/12 across 1440×900, 768×1024, 390×844; images, overflow, console/HTTP errors, map and playback interactions passed |

## Build page-count note

The historical V1.2 report records 279 pages. The current pre-V4 base already contained the V3/postwar, then-and-now, and V2 region routes, which account for the current 286-page route inventory. V4's page-source diff contains no added route file; the V4 content changes did not increase the page count.

## Visual evidence

The Playwright run writes the current screenshot set, HTML report, and JSON report under the existing ignored `artifacts/visual-acceptance/` directory. The run was executed against the clean V4 build in the same controlled process as its local preview, and completed at 2026-10-19 11:55 (Asia/Taipei). The browser cache path was explicitly set to the installed Playwright Chromium cache because the Codex sandbox default path was unavailable.

## Decision

V4 is **PASS — CORRECTLY BLOCKED** for historical enablement. The quality implementation and regression/visual checks pass, but historical enablement remains blocked until the coordinate, timeline-translation, and remaining media review items are decided by a human/editor.
