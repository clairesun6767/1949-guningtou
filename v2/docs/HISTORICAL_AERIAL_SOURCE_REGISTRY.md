# Historical Aerial Source Registry

本 registry 是 metadata-first 清單；2026-09-16 起另由 public low-res bundle 提供已授權的 z12 derived mosaic。原始 tile、higher-zoom 與含像素 screenshots 不在 public bundle。

Git-tracked KML mirrors：

- public/research/kinmen-kml/kinmen-1944.kml
- public/research/kinmen-kml/kinmen-1945.kml
- public/research/kinmen-kml/kinmen-1958.kml

程式 registry 的 HISTORICAL_AERIAL_KML_PATHS 與上述檔案一一對應；KML 內的 1×1 Icon 只作 placeholder，不能視為公開航照像素。

## Registered datasets

| id | year | source | tier | historical role | coverage | projection | rights | usage | production |
| --- | ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| KINMEN_1944 | 1944 | 中研院金門百年歷史地圖 WMTS／使用者 KML | Tier A historical aerial | PRIMARY | KML LatLonBox → Polygon | EPSG:3857／GoogleMapsCompatible | APPROVED（低解析度 z12 derived POC） | production-approved；原始／高解析度不公開 | YES（aerial=local） |
| KINMEN_1945 | 1945 | 中研院金門百年歷史地圖 WMTS／使用者 KML | Tier A historical aerial | PRIMARY | KML LatLonBox → Polygon | EPSG:3857／GoogleMapsCompatible | APPROVED（低解析度 z12 derived POC） | production-approved；原始／高解析度不公開 | YES（aerial=local） |
| KINMEN_1958 | 1958 | 中研院金門百年歷史地圖 WMTS／使用者 KML | Tier A historical aerial | FALLBACK | KML LatLonBox → Polygon | EPSG:3857／GoogleMapsCompatible | APPROVED（低解析度 z12 derived POC） | production-approved；原始／高解析度不公開 | YES（aerial=local） |

## Unregistered research leads

| candidate | source id | tier | state |
| --- | --- | --- | --- |
| Xiamen 1946 map | Amoy_12500_1946 | Tier B | catalogued candidate；bounds／rights／derivative use still require verification |
| Xiamen 1938 map | Amoy_10K_1938 | Tier B context | official layer listing；not a 1943–46 aerial |
| Gulangyu 1938 map | Amoy_1938 | Tier B context | official metadata observed；not a 1943–46 aerial |
| Xiamen 1943–45 aerial | XIAMEN_WWII_AERIAL_UNVERIFIED_01；NARA RG 373 JX／24N118E | Tier A lead | DATE UNVERIFIED；no flight／frame／spot／NAID verified；pixels local-only |
| WWII Amoy target map | research lead only | Tier C | no verified production dataset |

## Renderer contract

Renderer only consumes HistoricalAerialDataset and selection APIs. Adding a future Xiamen verified dataset should require a registry entry and source metadata, not a new year-specific renderer branch. Until rights and alignment are verified, provider status remains source review／rights blocked；Xiamen current application mode is EVIDENCE / GEOREGISTRATION RESEARCH.
