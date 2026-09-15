# Historical Aerial Source Registry

本 registry 是 metadata-first 清單；目前不內含任何航照像素、mosaic、atlas 或 derived texture。

## Registered datasets

| id | year | source | tier | historical role | coverage | projection | rights | usage | production |
| --- | ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| KINMEN_1944 | 1944 | 中研院金門百年歷史地圖 WMTS／使用者 KML | Tier A historical aerial | PRIMARY | KML LatLonBox → Polygon | EPSG:3857／GoogleMapsCompatible | BLOCKED — RIGHTS UNCLEAR | not-verified；local POC only | NO |
| KINMEN_1945 | 1945 | 中研院金門百年歷史地圖 WMTS／使用者 KML | Tier A historical aerial | PRIMARY | KML LatLonBox → Polygon | EPSG:3857／GoogleMapsCompatible | BLOCKED — RIGHTS UNCLEAR | not-verified；local POC only | NO |
| KINMEN_1958 | 1958 | 中研院金門百年歷史地圖 WMTS／使用者 KML | Tier A historical aerial | FALLBACK | KML LatLonBox → Polygon | EPSG:3857／GoogleMapsCompatible | BLOCKED — RIGHTS UNCLEAR | not-verified；local POC only | NO |

## Unregistered research leads

| candidate | source id | tier | state |
| --- | --- | --- | --- |
| Xiamen 1946 map | Amoy_12500_1946 | Tier B | catalogued candidate；bounds／rights／derivative use still require verification |
| Xiamen 1938 map | Amoy_10K_1938 | Tier B context | official layer listing；not a 1943–46 aerial |
| Gulangyu 1938 map | Amoy_1938 | Tier B context | official metadata observed；not a 1943–46 aerial |
| Xiamen 1943–45 aerial | NARA RG 373 JX／24N118E | Tier A lead | no flight／frame／spot／NAID verified |
| WWII Amoy target map | research lead only | Tier C | no verified production dataset |

## Renderer contract

Renderer only consumes HistoricalAerialDataset and selection APIs. Adding a future XIAMEN_1944 dataset should require a registry entry and source metadata, not a new year-specific renderer branch. Until rights and alignment are verified, provider status remains source review／rights blocked.
