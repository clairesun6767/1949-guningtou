# V4.0 歷史地圖與地圖資產稽核

## Reviewed assets

| Asset family | Location | Status / limitation |
| --- | --- | --- |
| User-provided historical route map | `public/map-data/historical-battle-map.jpg` | Published as a schematic source image; not a precision georeference |
| Cartographic terrain and coastline | `public/map-data/*cartography*`, `*coastline*` | Existing renderer assets; unchanged |
| Classification textures | `public/map-data/*classification*` | Existing V0.8.1 rendering assets; unchanged |
| Existing route traces | `data/battles/guningtou-1949/historical-battle-map-traces.geojson` | Retained as source-traced research geometry; not promoted to verified route |
| Battle movement data | `data/battles/guningtou-1949/battle-movements.geojson` | Existing approximate axes/corridors; not rewritten as exact routes |
| Aerial references | `public/aerial-1944*.png`, `public/.local/aerial-poc/*` | Aerial/reference material with provenance and precision limits |
| KML research references | `public/research/kinmen-kml/*` | Research aids; not canonical historical coordinates |

## Findings

- No route geometry, coastline, terrain, historical trace, or canonical coordinate was changed by V4.
- The historical route image remains labelled schematic. It is not used to auto-snap or recalculate battle traces.
- The 1944/1945/1958 aerial POC files remain research/display material. Their date and georeferencing limits are retained.
- The site must continue to distinguish a modern visitor map, a historical source image, approximate movement corridors, and verified canonical geometry.
