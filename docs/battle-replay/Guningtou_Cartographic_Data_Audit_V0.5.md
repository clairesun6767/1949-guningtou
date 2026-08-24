# Guningtou Cartographic Data Audit V0.5

Audit date: 2026-08-23  
Runtime reference era: `modern_reference`

## Decision

V0.5 uses OpenStreetMap for the independent coastline and selected modern cartographic context. SRTM remains an elevation-only source. Neither dataset is presented as a reconstruction of the 1949 landscape.

The approved semantic stack is:

`terrain → coastline → land cover → roads → settlements → vegetation → beaches → historical POI → battle events → historical imagery → labels → research layer`

No cartographic source was converted into battle routes, battle directions, battle areas, or event geometry.

## Source and licence register

| Dataset | Use | Coverage / scale | Source resolution | Acquired | Licence / attribution | `referenceEra` |
| --- | --- | --- | --- | --- | --- | --- |
| OpenStreetMap coastline | Regional island land polygons and local Guningtou land mask | Regional bbox `117.95,24.30–118.60,24.70`; local bbox `118.285,24.44–118.37,24.50` | Vector; no fixed raster resolution. Regional simplification `0.00012°`, local `0.000025°` | 2026-08-23 | © OpenStreetMap contributors, [ODbL 1.0](https://www.openstreetmap.org/copyright) | `modern_reference` |
| OpenStreetMap land use / natural / highway / building tags | Agriculture, forest, settlement, beach, open ground, road hierarchy, local building blocks | Same regional and local bboxes | Vector; regional cartography simplified at `0.00024°`, local at `0.000025°` | 2026-08-23 | © OpenStreetMap contributors, ODbL 1.0 | `modern_reference` |
| Mapzen Terrain Tiles / SRTM N24E118 | Elevation, normals, lighting relief, terrain-conforming height sampling | Regional DEM `117.97,24.34–118.58,24.65`; local DEM `118.285,24.44–118.37,24.50` | About 30 m native SRTM | 2026-08-23 | Mapzen; SRTM data courtesy of the U.S. Geological Survey; [Registry of Open Data on AWS](https://registry.opendata.aws/terrain-tiles/) | `modern_reference` |
| 1944 aerial imagery records | Historical imagery layer only | Guningtou package | GCP count `0`; georeference pending | Existing package | Existing project provenance | Not promoted; layer remains OFF and locked |

OSM `natural=coastline` represents the mean high-water line. Its ways are directional and may require stitching; see the [OSM coastline documentation](https://wiki.openstreetmap.org/wiki/Coastline) and [`natural=coastline` tag definition](https://wiki.openstreetmap.org/wiki/Tag%3Anatural%3Dcoastline). Beaches use explicit OSM beach/sand tags, not elevation inference; see [OSM beach mapping](https://wiki.openstreetmap.org/wiki/Beach).

## Runtime asset inventory

| Asset | Features | Raw bytes | Gzip bytes | Notes |
| --- | ---: | ---: | ---: | --- |
| `regional-coastline.geojson` | 32 | 66,868 | 18,355 | Closed island land polygons; independent of DEM zeros |
| `guningtou-coastline.geojson` | 1 | 4,176 | 1,508 | High-resolution northwestern Kinmen land polygon |
| `regional-cartography.geojson` | 880 | 505,997 | 96,382 | Scale-filtered strategic context; under 500 KiB raw and 100 KiB gzip |
| `guningtou-cartography.geojson` | 681 | 289,964 | 35,400 | Local visitor detail |
| `kinmen-xiamen-regional.json` | DEM 196×100 | 86,295 | 12,180 | Elevation source only at runtime |
| `guningtou-local.json` | DEM 320×256 | 358,372 | 22,411 | Near-native sampling; no increase in source accuracy |

Local category counts are: agriculture 52, forest 13, settlement areas 13, settlement blocks 256, open ground 6, beaches 10, primary roads 10, secondary roads 86, local roads 235.

## Processing policy

- `scripts/build-cartographic-map-assets.mjs` holds the Overpass queries, clipping bounds, classification rules, simplification tolerances, feature budgets, source metadata, and output checks.
- Regional and local vectors use different tolerances and budgets.
- Local vectors are clipped to the declared Guningtou bbox.
- Roads retain only the approved hierarchy. Local building footprints are capped and rendered as modern reference blocks.
- All browser geometry remains WGS84 until the existing `wgs84ToLocalMeters` adapter projects it into the Three.js local tangent plane.
- Local DEM 320×256 sampling is close to SRTM's native spacing. It does not create new survey accuracy or historical evidence.
- The legacy DEM-derived `land` array remains in the terrain JSON for schema compatibility, but V0.5 runtime terrain masking explicitly ignores it.

## Historical integrity

| Check | Result |
| --- | --- |
| Promoted historical routes | `0` |
| Canonical `routes.geojson` features | `0` |
| Canonical `battle-areas.geojson` features | `0` |
| Synthetic battle geometry added by V0.5 | `0` |
| Cartographic features marked historical | `0` |
| 1944 imagery enabled before georeference | No |

