# Guningtou Cartographic Visual Validation V0.5

Validation date: 2026-08-23  
Route: `http://localhost:4321/1949-guningtou/zh-tw/map/`

## Same-camera BEFORE / AFTER

The V0.4 and V0.5 Guningtou desktop evidence uses the same `guningtou` camera preset at 1440×900.

| State | Evidence |
| --- | --- |
| BEFORE — V0.4 relief-first surface | [before-v0.4-guningtou-desktop-1440x900.jpg](screenshots/v0.5/before-v0.4-guningtou-desktop-1440x900.jpg) |
| AFTER — V0.5 semantic cartographic surface | [after-guningtou-desktop-1440x900.png](screenshots/v0.5/after-guningtou-desktop-1440x900.png) |

Additional evidence:

- [Strategic desktop 1440×900](screenshots/v0.5/after-strategic-desktop-1440x900.png)
- [Strategic mobile 390×844](screenshots/v0.5/after-strategic-mobile-390x844.png)
- [Guningtou mobile 390×844](screenshots/v0.5/after-guningtou-mobile-390x844.png)

## Visual acceptance

| Acceptance item | Result | Evidence |
| --- | --- | --- |
| Geography is primary on the homepage | PASS | Title reduced; Xiamen, Dadeng, Xiaodeng, Kinmen, and Guningtou remain spatially legible |
| Coastline is not DEM-derived | PASS | Runtime uses OSM polygon alpha masks and a separate vector shoreline |
| Regional coastline avoids grid staircase | PASS | 2048-wide alpha mask generated from 32 closed OSM island polygons |
| Local map is not an empty beige DEM | PASS | Agriculture, forest, settlement, beach, road, building, terrain, and POI layers are visible |
| Roads read as cartographic ribbons | PASS | Three hierarchy widths; terrain-conforming densified geometry |
| Villages and building context are visible | PASS | OSM residential polygons plus capped instanced building blocks |
| Beaches use an explicit source | PASS | Ten local OSM beach/sand polygons; no elevation-only inference |
| Six canonical POIs remain legible on desktop | PASS | Six labels observed in browser DOM and visual screenshot |
| Longkou labels do not overlap | PASS | Desktop split east/west; mobile prioritizes Longkou Coast above the map |
| Mobile remains usable | PASS | 390×844 strategic and local checks; four priority labels and horizontal controls |
| One Layer Manager only | PASS | Existing panel updated with the V0.5 semantic stack |
| Historical imagery remains unregistered | PASS | OFF by default and disabled while georeference is pending |
| Browser console | PASS | No warning or error entries during strategic, local, layer, and mobile checks |

## Layer and runtime checks

- Existing Layer Manager showed 12 rows and the expected default pressed states.
- Historical Imagery and Research Layer were disabled in visitor mode.
- Visitor page asset inventory included the Three renderer, two DEM files, two coastline files, and two cartography files.
- No Cesium engine/runtime asset was observed during normal Three visitor use. The shared lightweight Cesium adapter may exist in the visualization index, but the Cesium engine stays lazy.
- Final Dev QA reported 144,324 triangles, 18 draw calls, 912 regional semantic/coastline features, and 682 local semantic/coastline features.

## Automated verification

| Command | Result |
| --- | --- |
| `npm run validate:battle-data` | PASS — quality errors 0, warnings 0; calibration errors 0, four expected pending-georeference warnings; promoted routes 0 |
| `npm run typecheck` | PASS — 0 errors, 0 warnings, 0 hints |
| `npm run test:battle-data` | PASS — 40/40 |
| `npm run build` | PASS — 275 pages |

## Historical integrity

| Metric | Result |
| --- | ---: |
| Historical integrity errors | 0 |
| Synthetic battle routes | 0 |
| Synthetic battle areas | 0 |
| Modern cartographic features labelled historical | 0 |
| Promoted legacy topology routes | 0 |
