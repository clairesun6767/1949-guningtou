# Guningtou Three Terrain Audit V0.4

Date: 2026-08-23  
Scope: Kinmen–Xiamen regional terrain and Guningtou local visitor terrain

## Result

The repository contained no DEM, DTM, HGT, GeoTIFF, or other measured elevation grid before V0.4. `data/terrain_database.json` is a semantic terrain taxonomy with estimated average heights; it is not suitable for geographic rendering and is not used as elevation input.

V0.4 therefore uses a modern geographic elevation reference derived from the N24E118 SRTM tile distributed through [Mapzen Terrain Tiles on AWS Open Data](https://registry.opendata.aws/terrain-tiles/). The native tile is a 3601×3601 one-arc-second HGT grid, approximately 30 m at the source. Attribution: Mapzen; SRTM data courtesy of the U.S. Geological Survey.

This source is not a 1949 terrain reconstruction. It supplies visitor orientation and relief only. The unregistered 1944 aerial photographs remain excluded from terrain alignment.

## Derived assets

| LOD | Bounds (EPSG:4326) | Runtime grid | Approx. sample spacing | File size | Purpose |
| --- | --- | ---: | ---: | ---: | --- |
| Kinmen–Xiamen regional | 117.970–118.580 E, 24.340–24.650 N | 196×100 | 317×348 m | 86,177 B | Xiamen, Kinmen, Dadeng, Xiaodeng, Guningtou orientation |
| Guningtou local | 118.285–118.370 E, 24.440–24.500 N | 160×112 | 54×60 m | 79,246 B | Six canonical Locations within an 8.6×6.7 km scene |

The source HGT is not committed. Reproducible derivation is implemented in `scripts/build-three-terrain-assets.mjs`; it accepts the downloaded `N24E118.hgt.gz` and writes the two small runtime JSON assets under `public/terrain/`.

## Coastline and zero-value treatment

- Regional land is source elevation greater than zero with a one-cell coastal closure.
- The local crop is a north-facing coastal view. Its shoreline is derived as a five-column median envelope of the first positive SRTM sample in each longitude column.
- Enclosed zero values inside the resulting local land mask receive the lowest positive value from the nearest source neighbourhood.
- These are renderer-oriented generalizations required because sea level and low-lying land both occur as zero in the sampled HGT. They are disclosed derivations, not historical coastline claims.
- No Natural Earth imagery or rectangular map texture is used by the Three.js visitor renderer. Land is emitted as clipped triangles; the sea is a separate display plane.

## Coordinate integrity

- Canonical source remains `data/battles/guningtou-1949/locations.geojson`.
- All six WGS84 coordinates are read without modification.
- The Three adapter converts WGS84 to a local east/north tangent plane in metres at runtime, with origin 118.275 E, 24.490 N.
- Runtime terrain height is sampled only for marker placement; it is never written back to canonical data.
- Routes promoted: 0.
- Synthetic battle geometry: 0.
- Historical imagery falsely aligned: 0.

## Known limits

- SRTM represents modern bare-earth reference data, not wartime surface conditions, fortifications, vegetation, buildings, or the 1949 shoreline.
- Regional LOD deliberately trades local detail for a compact initial payload.
- Local shoreline is appropriate for the north-facing Guningtou visitor scene but is not a survey-grade coastline product.
- The 1944 images still have zero GCPs and remain explicitly marked `GEOREFERENCE PENDING`.

