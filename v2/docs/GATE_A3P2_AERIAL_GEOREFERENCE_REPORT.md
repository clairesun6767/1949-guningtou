# Gate A.3P.2 — Aerial Georeference Bugfix Report

## 最終狀態

GATE A.3P.2 — READY FOR GEOREFERENCE REVIEW

- Branch：feature/2.0-art-region-environment-poc
- 日期：2026-09-16
- 範圍：只處理 historical aerial 的 geographic footprint、mosaic bounds、UV、XYZ/TMS 驗證、out-of-bounds sampling 與 tile debug。
- 明確停止：本輪沒有進 Gate B，也沒有調整 Ocean、Cloud、Cloud Shadow、Atmosphere、UI art direction、camera、DEM exaggeration 或 historical opacity。
- 歷史影像狀態：TILE-BOUND ALIGNED / NOT VERIFIED ORTHORECTIFIED。
- 公開權利狀態：1944／1945／1958 z12 derived mosaic 已取得本專案授權；higher-zoom 與含像素截圖仍 local-only。

本輪修正後，原先落在大嶝島周邊的矩形航照投影，改由實際 XYZ tile footprint 驅動；瀏覽器目視檢查顯示 1944、1945、1958 與 Smart Composite 都位於古寧頭／金門 review area。這是 tile-bound alignment，不是歷史航照的 GCP 或 orthorectification 證明。

## 1. Root cause

| 問題 | 修正前實際行為 | 判定 |
| --- | --- | --- |
| Terrain UV 與 aerial UV 的北南軸不一致 | 舊的 aerialUvBoundsFor 以 top-down latitude 計算 y，但 geometry 的 vRegionUv.y 是 south=0、north=1，造成 north/south 方向不一致 | 主要 root cause |
| KML extent 與 raster extent 語意未分離 | dataset bounds 是 KML LatLonBox，卻沒有型別層級的 DeclaredDatasetExtent／ActualMosaicExtent 邊界 | 造成 footprint 來源不明確 |
| Out-of-bounds texture sampling | shader 在 aerial footprint 外仍可 sample；ClampToEdge 會把邊緣像素延伸到 footprint 外 | 造成大型矩形／跨區域延伸的第二個 root cause |
| Smart Composite footprint contract 不完整 | composite 主要依賴 texture 尺寸，沒有在產生前驗證每個來源的 tile range、bounds、tileSize 是否為共同 geographic grid | 已改為 mismatch 時拒絕 composite |
| XYZ/TMS | 不能由 z/x/y 字串直接假設語意 | controlled endpoint test 證明本 POC 使用 XYZ；不是這次的 root cause |

因此本次 root cause 是「UV north/south mismatch + out-of-bounds sampling + extent semantics 未分離」的組合，不是手動 offset、rotation 或 scale。

## 2. KML → tile → mosaic → terrain → shader audit

| 階段 | 實際值／實作位置 | 結論 |
| --- | --- | --- |
| KML | 1944、1945、1958 的 LatLonBox 由 public/research/kinmen-kml/*.kml 解析 | 保留為 declared extent |
| tileTemplate | Sinica MapTilePyramid 的 z/x/y placeholders；registry 的 source coordinateOrder 仍保留 UNKNOWN | 不把 KML 宣稱成像素定位證明 |
| POC request | west 118.278、south 24.438、east 118.372、north 24.520；z=12；POC coordinateOrder=XYZ | geographic request，不是視覺偏移 |
| tile enumeration | x=3393–3394、y=1760–1761；每個年份 4 張，合計 12 張 | 由 lon/lat 與 Web Mercator tile math 推導 |
| downloaded tile | 1944、1945、1958 各 4/4 READY；總下載 650,525 bytes | 仍是 local POC |
| mosaic | 每個來源 512×512；row 0 對應 XYZ north；實際 bounds 由 tile range 計算 | 使用 actual mosaic extent |
| terrain lon/lat | Region composition asset bounds：117.84–118.60E、24.28–24.72N | 不把 terrain bounds 當成 aerial bounds |
| world X/Z | lonLatToWorld：east 為 +X；north 為 -Z；reference origin 118.24E／24.49N；1 unit=1 km | geographic to world 可逆 |
| aerial UV | shader 先由 terrain UV 還原 terrain lon/lat，再用 actual mosaic bounds 計算 geographic UV | 不再使用舊的相對 UV rectangle |
| shader sample | 僅在 aerialInBounds 且 texture available 時 sample；外部維持 BASE | 不以 ClampToEdge 延伸影像 |

## 3. Declared dataset extent：KML LatLonBox

這些是資料來源宣告的範圍，不是 512×512 POC mosaic 的像素 footprint。

| 年份 | west | south | east | north | role |
| --- | ---: | ---: | ---: | ---: | --- |
| 1944 | 118.1987492 | 24.3932995 | 118.4750534 | 24.5208965 | PRIMARY |
| 1945 | 118.2727648 | 24.3437997 | 118.4966956 | 24.5362935 | PRIMARY |
| 1958 | 118.1973476 | 24.3789698 | 118.4924002 | 24.5542212 | FALLBACK |

UI 與 source registry 現在標示 1944／1945／1958 z12 derived mosaic 為 `APPROVED`（專案範圍低解析度授權）；原始 WMTS、高解析度與 higher-zoom pixels 仍不公開。

## 4. Authoritative actual POC mosaic extent

### 4.1 Requested range

POC request：

- zoom：12
- coordinate order：XYZ
- requested tile range：z12 / x3393–3394 / y1760–1761
- tile size：256
- mosaic size：512×512

### 4.2 XYZ-derived tile bounds

Web Mercator edge math 使用：

- west edge = tileXYZToLonLat(minX, minY, z)
- east edge = tileXYZToLonLat(maxX + 1, maxY + 1, z)
- north edge = minY 的 north edge
- south edge = maxY+1 的 south edge

| tile | west | south | east | north |
| --- | ---: | ---: | ---: | ---: |
| z12/x3393/y1760 | 118.212890625 | 24.44714958973082 | 118.30078125 | 24.5271348225978 |
| z12/x3394/y1760 | 118.30078125 | 24.44714958973082 | 118.388671875 | 24.5271348225978 |
| z12/x3393/y1761 | 118.212890625 | 24.367113562651262 | 118.30078125 | 24.44714958973082 |
| z12/x3394/y1761 | 118.30078125 | 24.367113562651262 | 118.388671875 | 24.44714958973082 |

### 4.3 ActualMosaicExtent

所有三個來源目前使用同一個 4-tile POC footprint：

- west：118.212890625
- south：24.367113562651262
- east：118.388671875
- north：24.5271348225978
- width／height：512×512
- requestedTileRange：z12 / x3393–3394 / y1760–1761

manifest 現在分開保存：

- DeclaredDatasetExtent：dataset.bounds，來源 KML LatLonBox
- ActualMosaicExtent：dataset.actualMosaicBounds／mosaic.actualMosaicBounds
- requestedTileRange：實際請求範圍
- validPixelMask：各年份 alpha>8 的 local mask
- compositeMosaicBounds：Smart Composite 的共同 geographic footprint

## 5. XYZ vs TMS controlled verification

公式：

    n = 2^z
    tmsY = n - 1 - xyzY

對 1945 Sinica endpoint 的 controlled probe：

| probe | URL tile coordinate | 結果 |
| --- | --- | --- |
| XYZ candidate | z12/x3393/y1760 | HTTP 200、image/png、15,152 bytes、256×256 PNG，可解碼 |
| TMS-flipped candidate | z12/x3393/y2335，其中 4096-1-1760=2335 | HTTP 200、198 bytes，非可解碼的有效 tile image |

因此本 POC 將 endpoint 視為 XYZ。若把 TMS y=2334–2335 誤當成 XYZ，會得到約 south=-24.5271348、north=-24.3671136 的南半球 footprint，與 KML／可解碼 XYZ tile 不一致。TMS 不是本次大嶝錯位的 root cause。

## 6. Terrain、world 與 UV contract

Terrain bounds：

- REGION_COMPOSITION_BOUNDS = west 117.84、south 24.28、east 118.60、north 24.72
- geometry 的 vRegionUv.x：west=0、east=1
- geometry 的 vRegionUv.y：south=0、north=1
- world x：longitude 增加時增加
- world z：latitude 增加時減少

Shader 先求 terrain geographic position：

    terrainLongitude = mix(terrainWest, terrainEast, vRegionUv.x)
    terrainLatitude = mix(terrainSouth, terrainNorth, vRegionUv.y)

再以 ActualMosaicExtent 求 aerial UV：

    u = (lon - mosaicWest) / (mosaicEast - mosaicWest)
    v = (mosaicNorth - lat) / (mosaicNorth - mosaicSouth)

Texture row contract：

- mosaic row 0 是 XYZ north row
- HistoricalAerialLayer 設定 texture.flipY=false
- shader 的 v=0 對應 mosaic north row
- northMapsToV0、southMapsToV1、westMapsToU0、eastMapsToU1 已由 regression tests 固定

Out-of-bounds contract：

- aerialInBounds 以 u、v 是否在 0..1 內判定
- aerialInBounds=0 時不呼叫 texture2D
- aerialSample 維持透明零值，最終 historicalWeight=0，回到 BASE
- GPU wrap 設定不能再成為 footprint coverage；ClampToEdge 不會被拿來把邊緣像素延伸出 ActualMosaicExtent

## 7. Geographic sanity checks

以下座標是現有專案 reference／local coastline 的 review anchors，不是新增的歷史 GCP，也不宣稱完成 orthorectification。

| check | longitude | latitude | actual mosaic UV | in bounds | status |
| --- | ---: | ---: | --- | --- | --- |
| 古寧頭既有 config target | 118.318000 | 24.478000 | u=0.597956、v=0.307052 | true | TILE-BOUND ALIGNED |
| 北山／南山 review anchor，古寧頭北側 local context | 118.318000 | 24.487000 | u=0.597956、v=0.250809 | true | TILE-BOUND ALIGNED |
| 金門北岸 coastline point，取自 guningtou-coastline.geojson | 118.311860 | 24.490100 | u=0.563026、v=0.231437 | true | TILE-BOUND ALIGNED |

三個 check 都落在相同 ActualMosaicExtent；瀏覽器的 GEO_01 tile footprint overlay 與 GEO_02–GEO_06 local review 顯示 footprint 在金門／古寧頭 context，而不是大嶝島周邊。最終 UI status 保持：

    TILE-BOUND ALIGNED / NOT VERIFIED ORTHORECTIFIED

## 8. Smart Composite 與 year switching

- 每個 source dataset 都保存自己的 requestedTileRange、actualMosaicBounds、validPixelMask。
- Smart Composite 產生前驗證共同 zoom、tileSize、texture 尺寸與 tileRange-derived bounds。
- 若未來來源 footprint 不同，pipeline 會拒絕直接 composite，要求先 reproject／resample 到共同 geographic grid。
- 本次三個來源的 POC footprint 相同，所以 compositeMosaicBounds 仍為 118.212890625–118.388671875E、24.367113562651262–24.5271348225978N。
- year switching 使用 H1=1944、H2=1945、H3=1958、H4=Smart Composite；1958 維持 FALLBACK，不把較晚年份當 PRIMARY。
- local Smart source mask 實測 distribution：1944 13.21%、1945 52.99%、1958 11.01%、BASE 22.79%。
- public low-res asset 不存在、未明確以 `aerial=local` 請求或 rights-blocked 時，HistoricalAerialLayer 不建立 texture，shader 使用 classification／BASE fallback，不產生 broken image。

## 9. Browser evidence

固定鏡位：ART_REVIEW_KINMEN_XIAMEN_01；Chrome headless actual page output；viewport 1920×1080。

### GitHub-safe、無 rights-unclear aerial pixels

| evidence | repository path | 用途 |
| --- | --- | --- |
| GEO_01_TILE_FOOTPRINT | docs/2.0/screenshots/gate-a3p2/GEO_01_TILE_FOOTPRINT.png | XYZ z/x/y、每格 bounds、year labels；metadata-only |
| GEO_COVERAGE | docs/2.0/screenshots/gate-a3p2/GEO_COVERAGE.png | KML declared coverage outline |
| GEO_P0 | docs/2.0/screenshots/gate-a3p2/GEO_P0.png | P0 baseline |
| GEO_P1 | docs/2.0/screenshots/gate-a3p2/GEO_P1.png | P1 enhanced environment |
| GEO_OCEAN_BEFORE | docs/2.0/screenshots/gate-a3p2/GEO_OCEAN_BEFORE.png | Ocean before |
| GEO_OCEAN_AFTER | docs/2.0/screenshots/gate-a3p2/GEO_OCEAN_AFTER.png | Ocean after |
| GEO_DAYLIGHT_T0 | docs/2.0/screenshots/gate-a3p2/GEO_DAYLIGHT_T0.png | Daylight T0 |
| GEO_DAWN_T1 | docs/2.0/screenshots/gate-a3p2/GEO_DAWN_T1.png | Dawn T1 |
| screenshot manifest | docs/2.0/screenshots/gate-a3p2/manifest.json | safe screenshot index |
| performance metadata | docs/2.0/screenshots/gate-a3p2/performance.json | P0–P3 FPS／frame time／stats；不含 pixels |

### LOCAL ONLY、不可推送

以下檔案含 rights-unclear Kinmen aerial pixels，只保留在 ignored directory：

    .local/aerial-poc/screenshots/gate-a3p2/GEO_02_1944.png
    .local/aerial-poc/screenshots/gate-a3p2/GEO_03_1945.png
    .local/aerial-poc/screenshots/gate-a3p2/GEO_04_1958.png
    .local/aerial-poc/screenshots/gate-a3p2/GEO_05_SMART.png
    .local/aerial-poc/screenshots/gate-a3p2/GEO_06_SMART_ENVIRONMENT.png
    .local/aerial-poc/screenshots/gate-a3p2/GEO_SOURCE_MAP.png
    .local/aerial-poc/screenshots/gate-a3p2/GEO_P2.png
    .local/aerial-poc/screenshots/gate-a3p2/GEO_P3.png
    .local/aerial-poc/screenshots/gate-a3p2/GEO_CLOUD_T0.png
    .local/aerial-poc/screenshots/gate-a3p2/GEO_CLOUD_T1.png

local manifest：

    .local/aerial-poc/screenshots/gate-a3p2/manifest.json

GEO_01、safe coverage 與 safe performance screenshots 不載入 rights-unclear pixels；因此可提交。local-only screenshots 不會被 Git tracking，且本報告不嵌入它們。

## 10. P0/P1/P2/P3 browser performance

取樣方式：每個情境等候頁面 ready 後，以 requestAnimationFrame 取 150 frames；GPU frame 在此瀏覽器未暴露，故報告 CPU frame 與 wall-clock FPS。

| tier | environment | aerial | FPS | average frame | p95 frame | canvas | ready |
| --- | --- | --- | ---: | ---: | ---: | --- | ---: |
| P0 | P0／T0／W0 | none | 60.002 | 16.6662 ms | 16.8000 ms | 1610×824 | 808 ms |
| P1 | P1／T0／W1 | none | 60.004 | 16.6655 ms | 16.9000 ms | 1610×824 | 917 ms |
| P2 | P2／T2／W0 | local Smart | 60.002 | 16.6662 ms | 16.9000 ms | 1610×824 | 916 ms |
| P3 | P3／T0／W1 | local Smart | 59.999 | 16.6669 ms | 16.8000 ms | 1610×824 | 930 ms |

P2／P3 debug screenshot 是 LOCAL ONLY；performance.json 只有 metadata。P2／P3 的 local aerial download bytes 是 650,525，smart composite payload 是 309,194 bytes。

## 11. Regression and build

已通過：

- npm.cmd run test:v2：45/45 tests passed
- tileXYZToLonLat：通過
- tileRangeToBounds：通過
- geographicToAerialUV：通過
- northMapsToV0／southMapsToV1／westMapsToU0／eastMapsToU1：通過
- outsideBoundsReturnsBase：通過
- smartCompositeUsesCommonGeographicGrid：通過
- Guningtou 118.318／24.478：在 expected ActualMosaicExtent 內
- source contract：兩個 terrain shader 都使用 geographic bounds、in-bounds gate 與 texture2D guard
- AERIAL_TILE_DEBUG：由 HISTORICAL_AERIAL_POC_REQUEST 推導 tile footprints，未載入 aerial pixels
- npm.cmd run build：通過；Astro static build 產生 280 pages，只有既有 large chunk warning

本次 npm.cmd run typecheck 仍有 10 個既有 astro.config.mjs implicit-any／Node type errors、0 warnings、0 hints；沒有指向本輪 georeference 修改檔案的錯誤，因此不將它誤算成 A.3P.2 regression。

## 12. Reproducible commands

    npm.cmd run test:v2
    npm.cmd run build
    npm.cmd run benchmark:gate-a3p2-georef
    node scripts/capture-gate-a3p2-georef.mjs

Download script 仍採 sequential、bounded POC policy；不因本輪 georeference 修正擴大下載範圍。

## 13. Files changed for this gate

- v2/shared/historicalAerialGeoreference.ts
- v2/shared/historicalAerialTiles.ts
- v2/shared/historicalAerialDataset.ts
- v2/config/historicalAerialRegistry.ts
- v2/config/historicalAerial.ts
- v2/prototypes/region/HistoricalAerialLayer.ts
- v2/prototypes/region/RegionTerrain.ts
- v2/prototypes/region/RegionQualityTerrain.ts
- v2/prototypes/region/RegionScene.ts
- v2/app/RegionPrototype.tsx
- v2/app/region.css
- scripts/download-historical-aerial-poc.mjs
- scripts/capture-gate-a3p2-georef.mjs
- scripts/benchmark-gate-a3p1-browser.mjs
- scripts/benchmark-gate-a3p2-georef.mjs
- tests/v2/historical-aerial.test.mjs
- tests/v2/region.test.mjs

STOP。不要進 Gate B。
