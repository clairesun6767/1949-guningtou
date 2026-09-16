# GATE A.3P.2b — HIGHER-ZOOM GUNINGTOU GEOREFERENCE VALIDATION

狀態：**GATE A.3P.2B — READY FOR LOCAL AERIAL REVIEW**

本輪只驗證古寧頭附近的 higher-zoom local georeference test。未進 Gate B，未調整 Ocean／Cloud／UI 美術，也未做 Smart Composite。

## 1. 測試範圍

| 項目 | 實測值 |
| --- | --- |
| 地理目標 | 118.318E / 24.478N |
| 目標來源 | 現有 REGION_CONFIG.presets.guningtou.target |
| 固定鏡頭 | GEO_REVIEW_GUNINGTOU_01 |
| URL camera query | geo_review_guningtou_01 |
| 測試年份 | 1944、1945、1958 |
| 測試倍率 | z15、z16、z17 |
| tile window | 每個 zoom 共享 2×2 exact XYZ tile union |
| 上限 | 每個 zoom 12 次 endpoint request（每年 4 tiles），低於 16 tiles 上限 |
| 選取模式 | 1944 ONLY／1945 ONLY／1958 ONLY；single，不使用 Smart Composite |
| 來源 | Sinica KML MapTilePyramid PNG endpoint |
| Rights | BLOCKED — RIGHTS UNCLEAR；航照 pixels 僅 local-only |

此範圍是由地理座標轉換成 XYZ tile range，沒有把歷史影像手動拉到看起來對齊的位置。

## 2. Tile 與 payload 實測

下表的 tile count 是每個 dataset 的 2×2 tile 數；requested tiles 是該 zoom 三個年度的合計。

| zoom | tile range | geographic bounds（union） | 單 tile 地理尺寸 | tile count | requested tiles | downloaded bytes | valid / missing |
| --- | --- | --- | --- | ---: | ---: | ---: | --- |
| z15 | x 27152–27153／y 14083–14084 | 118.300781–118.322754E／24.477150–24.497146N | 0.010986328125° lon × 0.009997757398° lat | 4 | 12 | 822,012 | 12 / 0 |
| z16 | x 54306–54307／y 28168–28169 | 118.311768–118.322754E／24.477150–24.487149N | 0.005493164063° lon × 0.004999176699° lat | 4 | 12 | 893,802 | 12 / 0 |
| z17 | x 108613–108614／y 56338–56339 | 118.314514–118.320007E／24.477150–24.482149N | 0.002746582031° lon × 0.002499662836° lat | 4 | 12 | 824,869 | 12 / 0 |

每個年份的 endpoint bytes：

| zoom | 1944 | 1945 | 1958 | 備註 |
| --- | ---: | ---: | ---: | --- |
| z15 | 185,484 B | 300,427 B | 336,101 B | 全部 4 / 4 有效 |
| z16 | 299,003 B | 209,175 B | 385,624 B | 全部 4 / 4 有效 |
| z17 | 345,277 B | 122,806 B | 356,786 B | 全部 4 / 4 有效 |

結果：三個 zoom、三個年份的 36 個 endpoint request 全部回傳有效 PNG；沒有 missing tile。總下載量 2,540,683 B，未超過 local POC budget。

## 3. Browser／Three.js 驗證

正式 browser DOM probe 使用：

http://localhost:4321/1949-guningtou/v2/region/?historical=H1&aerial=local&aerialZoom=17&year=1944&mode=single&opacity=65&aerialDebug=tile&camera=geo_review_guningtou_01&debug=open

觀測結果：

- camera target：118.318, 24.478；camera position：118.260, 24.399；distance：13.2。
- 航照狀態：LOCAL READY / RIGHTS REVIEW。
- z17 texture：512×512；tiles：4；downloaded bytes：824,869 B。
- z17 actual bounds：118.31451–118.32001E／24.47715–24.48215N。
- debug DOM：12 個 tile labels，5 個 landmark candidate labels。
- alignment 顯示：TILE-BOUND ALIGNED / NOT VERIFIED ORTHORECTIFIED。

這證明的是 Web Mercator tile union、Three.js terrain 的 geographic UV 投影與 out-of-bounds fallback；不證明歷史航照本身已完成 orthorectification。

一次開啟 debug panel 的 browser probe 觀測到約 60 FPS、16 draw calls、942,022 triangles。此數值是本機瀏覽器觀測，不是跨機器的性能 acceptance gate。

## 4. Landmark sanity check

候選座標來自既有現代／參考資料，只作 review target，不是歷史 GCP，也不代表航照已校正。

| landmark | 座標 | z15 footprint | z16 footprint | z17 footprint | 用途 |
| --- | --- | --- | --- | --- | --- |
| 古寧頭 | 118.318 / 24.478 | covered | covered | covered | target anchor |
| 北山 | 118.311207 / 24.479352 | covered | outside west edge | outside west edge | modern reference |
| 南山 | 118.307436 / 24.478553 | covered | outside west edge | outside west edge | modern reference |
| 林厝 | 118.313 / 24.475 | outside south edge | outside south edge | outside south edge | approximate source POI |
| 北側海岸 | 118.311860 / 24.490100 | covered | outside west／north edge | outside west／north edge | modern coastline reference |

因此，z15 是本輪唯一可以在同一個 compact footprint 內對古寧頭、北山、南山與北側海岸做三項以上 sanity check 的倍率。林厝位於本輪所有 2×2 footprint 南側之外；本輪沒有為了擴大範圍而追加下載。

畫面上的 landmark label 只表示現代參考點的位置；label 出現不等於該點位於該年度 historical aerial pixels 之內。

## 5. 視覺觀察與 alignment boundary

### z15

- 三個年度都能取得影像；1944 的有效像素比例較低，1945／1958 的地表紋理與海岸／田區輪廓較容易作初步辨識。
- footprint 最大，適合把古寧頭北側地理關係與至少三個現代 reference candidate 放在同一個 review frame。
- z15 是本輪的 recommended review zoom。

### z16

- 三個年度全部有效，單 tile geographic size 約減半，局部道路／田區紋理比 z15 細。
- footprint 已縮到古寧頭目標北側局部，北山、南山與北側海岸不再全數落入同一個 union。
- 適合作為 z15 之後的局部細節比較，不作本輪三 landmark 主判定。

### z17

- 三個年度全部有效，局部像素細節最高，1958 的田區／道路輪廓尤其適合近距離 review。
- footprint 僅約 0.55 km × 0.55 km 級別；適合古寧頭 target anchor 的 fine-detail review，不足以涵蓋北山、南山、林厝與北側海岸全部候選點。
- z17 可作 detail follow-up，但不是本輪 overall recommended zoom。

### Alignment 判定

- tile boundary placement：**0 residual by exact tile union construction**。
- historical photo feature 對現代 coastline／DEM 的像素或公尺偏差：**NOT MEASURED**。
- orthorectification：**NOT VERIFIED**。
- 本輪沒有手動平移、旋轉、縮放或拉伸任何 historical aerial image。若後續把現代 coastline／DEM 與歷史影像做 GCP QA，必須另行記錄 residual；不可把 tile-bound aligned 當成 photo-aligned。

## 6. Screenshots 與權利隔離

安全版（可進 Git）：

- docs/2.0/screenshots/gate-a3p2b/GUNINGTOU_TILE_GRID_Z17.png
- 只請求 H0 modern reference，顯示 tile boundary／XYZ／geographic bounds／landmark metadata，不含 aerial pixels。
- docs/2.0/screenshots/gate-a3p2b/manifest.json

Local-only（不進 Git、不上 GitHub）：

- .local/aerial-poc/screenshots/gate-a3p2b/GUNINGTOU_1944_Z15.png
- .local/aerial-poc/screenshots/gate-a3p2b/GUNINGTOU_1944_Z16.png
- .local/aerial-poc/screenshots/gate-a3p2b/GUNINGTOU_1944_Z17.png
- .local/aerial-poc/screenshots/gate-a3p2b/GUNINGTOU_1945_Z15.png
- .local/aerial-poc/screenshots/gate-a3p2b/GUNINGTOU_1945_Z16.png
- .local/aerial-poc/screenshots/gate-a3p2b/GUNINGTOU_1945_Z17.png
- .local/aerial-poc/screenshots/gate-a3p2b/GUNINGTOU_1958_Z15.png
- .local/aerial-poc/screenshots/gate-a3p2b/GUNINGTOU_1958_Z16.png
- .local/aerial-poc/screenshots/gate-a3p2b/GUNINGTOU_1958_Z17.png
- .local/aerial-poc/screenshots/gate-a3p2b/manifest.json

所有含 rights-unclear aerial pixels 的年度 screenshot 與 mosaic 都位於 .local/aerial-poc/，並由 .gitignore 排除。

## 7. 重現方式

1. 確認 Astro background dev server 在 http://localhost:4321 運作。
2. 若需重新抓取本輪小範圍 tile：執行 npm run poc:download:guningtou-high-zoom。
3. 若需重新產生 actual browser screenshots：執行 npm run benchmark:gate-a3p2b。
4. 只把 safe screenshot、metadata、source registry、code 與本報告提交到 Git；不要 force-add .local/aerial-poc/。

## 8. Gate boundary

本輪完成 higher-zoom Guningtou local georeference validation，狀態為：

**GATE A.3P.2B — READY FOR LOCAL AERIAL REVIEW**

STOP。不要進 Gate B。
