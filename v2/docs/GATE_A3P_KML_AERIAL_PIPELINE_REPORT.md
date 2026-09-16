# Gate A.3P — KML 歷史航照管線報告

審查日期：2026-09-16（Asia/Taipei）

本報告記錄 1944、1945、1958 三份使用者提供 KML 的實際解析、低量 POC、品質分析與 smart source mask。2026-09-16 起，依使用者取得的專案授權，GitHub 只公開三年度 z12 低解析度衍生 mosaic 與必要 manifest；高解析／higher-zoom tiles、測試截圖與廈門候選 JPEG 仍留在 root `.local/aerial-poc/`。

## 結論

- 三份 KML 均已在使用者 Downloads 找到，並由同一個 HistoricalAerialKmlParser 解析。
- KML 的 GroundOverlay/Icon 是 1×1 GIF 佔位圖；實際 tile 入口取自 gx:MapTilePyramid／Link，不把 Icon 當航照。
- 1944、1945 都登記為 PRIMARY；1958 登記為 FALLBACK，即使 1958 的區域性 sharpness 較高，也不得覆寫仍有效的 1944／1945 historical information。
- 古寧頭優先 POC 在 z12 請求 18 張 tile，總下載 1,112,970 bytes，低於 128 tiles／50 MB 上限；context 向東擴充一個 tile column，涵蓋古寧頭至東半島的本機 review 範圍。
- 實際來源是不規則、透明缺值的歷史掃描 tile；目前只達 TILE-BOUND ALIGNED，沒有可靠 control points，因此標示 NOT VERIFIED ORTHORECTIFIED。

## 1. 實際 KML 輸入與共用 parser

實際輸入檔名：

- 金門舊航照影像(1944) (1).kml
- 金門舊航照影像(1945).kml
- 金門舊航照圖(1958.09.10).kml

Parser 輸出統一的 HistoricalAerialDataset，包含 id、name、year、date、bounds、coverageGeometry、tileTemplate、min/max level、tileSize、projection、source、attribution、rightsStatus、usageStatus、qualityMetadata、historicalRole 與 coordinateOrder。

Parser 的選擇順序是：

1. 尋找含 MapTilePyramid 的 GroundOverlay。
2. 解析其 LatLonBox 與 Link href。
3. 忽略只提供 1×1 GIF 的 Icon href。
4. 正規化 z／x／y placeholder，並預設 GoogleMapsCompatible／EPSG:3857。

## 1A. Git-tracked KML mirrors 與 registry

為了讓 GitHub 上的 GPT／reviewer 能沿同一條 parser 路徑檢視來源結構，本次新增 metadata-only KML mirrors：

- public/research/kinmen-kml/kinmen-1944.kml
- public/research/kinmen-kml/kinmen-1945.kml
- public/research/kinmen-kml/kinmen-1958.kml

三檔保留 LatLonBox、gx:MapTilePyramid、tile template、來源頁與權利邊界；Icon 是 1×1 GIF placeholder，不是提交的航照像素。HistoricalAerialDatasetRegistry 以 HISTORICAL_AERIAL_KML_PATHS 對應三檔，測試會從檔案重新 parse 並核對 registry path。

## 2. KML metadata 驗證

| 年代 | Dataset name | west | south | east | north | min–max | tile template | role |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| 1944 | 金門舊航照影像(1944) | 118.1987492 | 24.3932995 | 118.4750534 | 24.5208965 | 0–19 | Kinmen_1944-png-{{z}}-{{x}}-{{y}} | PRIMARY |
| 1945 | 金門舊航照影像(1945) | 118.2727648 | 24.3437997 | 118.4966956 | 24.5362935 | 0–19 | Kinmen_1945-png-{{z}}-{{x}}-{{y}} | PRIMARY |
| 1958 | 金門舊航照圖(1958.09.10) | 118.1973476 | 24.3789698 | 118.4924002 | 24.5542212 | 0–19 | Kinmen_aerialphoto_1958-png-{{z}}-{{x}}-{{y}} | FALLBACK |

三個 coverageGeometry 均由各自 LatLonBox 自動建立為閉合 Polygon 五點環，不由人工繪製。

## 3. coverage overlap

| 交集 | 交集 bounds（west, south, east, north） | 判定 |
| --- | --- | --- |
| 1944 ∩ 1945 | 118.2727648, 24.3932995, 118.4750534, 24.5208965 | 有效重疊 |
| 1944 ∩ 1958 | 118.1987492, 24.3932995, 118.4750534, 24.5208965 | 有效重疊 |
| 1945 ∩ 1958 | 118.2727648, 24.3789698, 118.4924002, 24.5362935 | 有效重疊 |

古寧頭優先評估範圍：

- west 118.278
- south 24.438
- east 118.475
- north 24.52

此範圍落在三個 KML bounds 內；這只代表有候選 coverage，不代表每個像素都有有效航照。

## 4. 古寧頭本機 POC

請求規則：

- zoom：12
- 座標順序：XYZ
- concurrency：1
- 最小請求間隔：250 ms
- 先請求古寧頭優先範圍，不下載整島 max zoom
- 合計上限：128 tiles／50 MB

實際結果：

| 年代 | 狀態 | requested tiles | ready tiles | 原始下載 bytes | mosaic |
| --- | --- | ---: | ---: | ---: | --- |
| 1944 | READY | 6 | 6 | 281,616 | 768×512 |
| 1945 | READY | 6 | 6 | 425,118 | 768×512 |
| 1958 | READY | 6 | 6 | 406,236 | 768×512 |
| 合計 | withinBudget=true | 18 | 18 | 1,112,970 | smart 768×512 |

三年代的 tile range 都是 z12、x 3393–3395、y 1760–1761。Smart composite 使用 tile-level primary ordering，再逐像素處理透明缺值；1958 只在兩個 primary 都沒有有效像素時使用，剩餘位置標為 BASE。這次東半島補欄位是同一個 XYZ geographic grid 的 context 擴充，不是影像平移、旋轉或拉伸。

## 5. 品質分析

品質訊號包含 sharpness、contrast、entropy、alpha-valid ratio、information density 與 valid-pixel ratio。各訊號先限制在 0–1，再對本次 dataset set 的 raw score 做 min-max normalization；本次 raw score 範圍為 0.134873–0.730398。

| 年代 | normalized score | sharpness | contrast | entropy | alpha valid | information density | valid pixels |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1944 | 0.51795 | 0.16799 | 0.45857 | 0.89431 | 0.30358 | 0.66613 | 0.30358 |
| 1945 | 0.64699 | 0.14928 | 0.50211 | 0.91167 | 0.64400 | 0.68964 | 0.64400 |
| 1958 | 0.69727 | 0.42724 | 0.38624 | 0.78378 | 0.67186 | 0.57902 | 0.67186 |

本表是這次 6-tile／年度 context POC 的量測，不是整島品質結論。1958 的 sharpness 與 valid-pixel ratio 較高，但 historical date 較晚，所以仍固定為 fallback。

## 6. 1944／1945 primary 選擇

六個共同 tile 的 normalized tile score 比較：

- 1944 優於 1945：z12／x3393／y1761。
- 1945 優於 1944：z12／x3393／y1760、x3394／y1760、x3394／y1761、x3395／y1760、x3395／y1761。
- 1958 在這個小樣本的 sharpness 較高，但不參與 primary overwrite。

因此 renderer 使用 quality-aware primary selection，而不是固定「1945 永遠覆蓋 1944」。在透明缺值位置才進入 1958 fallback，再退回現代 DEM base。

## 7. Smart composite 與來源分布

smart-composite-z12.png 與 source-mask-z12.png 都只存在 .local/aerial-poc/；Git 不追蹤它們。

| source | 實際像素比例 |
| --- | ---: |
| 1944 | 8.81% |
| 1945 | 64.32% |
| 1958 fallback | 7.41% |
| Historical Base／現代 DEM | 19.46% |
| Xiamen historical source | 0%（本 Gate 尚無已驗證來源） |

這個比例只適用於本次 768×512 古寧頭／東半島 context mosaic；不可外推為金門全域比例。

## 8. Three.js 投影與 truth boundary

航照不是 DOM overlay，也不是 CSS 背景。Layer 會以 geographic bounds 計算 terrain UV bounds，將 texture 綁到 Three.js DEM surface；Aerial 不被當作 height map。現代 DEM 與現代 OSM 海岸線仍標示為 MODERN REFERENCE，航照標示為 HISTORICAL AERIAL。

目前對齊狀態：

TILE-BOUND ALIGNED / NOT VERIFIED ORTHORECTIFIED

原因是本 POC 尚未提供可重現的地面控制點、RMSE 或可靠的航照外方位參數。不能把 tile bounds 誤寫成完美正射校正。

## 8A. 官方圖層預覽交叉核對

2026-09-16 以中央研究院人社中心官方圖層預覽交叉核對：

- [Kinmen_1944 官方預覽](https://gis.sinica.edu.tw/showwmts/index.php?s=kinmen&l=Kinmen_1944)
- [Kinmen_1945 官方預覽](https://gis.sinica.edu.tw/showwmts/index.php?s=kinmen&l=Kinmen_1945)

官方預覽在現代底圖上同樣呈現多個旋轉的航照片 footprint、互相重疊的照片邊界與透明缺值；本機從相同 MapTilePyramid z/x/y endpoint 建出的 mosaic 保留了這個資料事實。故目前畫面中的「缺圖」是來源 alpha／coverage 缺值，「重疊」是來源航照片尚未完成正射校正與 seamline mosaic 的結果，不是 Three.js 重複載入同一張圖片。

若要求無缺口、無重疊的金門全島歷史底圖，必須另取得已正射校正的 full-island orthomosaic，或先完成每張航照的 GCP、外方位與 seamline mosaic；不能用目前 KML 的 declared bounds、現代 DEM 或人工 UV offset 假造這個結果。

## 9. Rights 與提交邊界

KML／WMTS 公開可讀本身不等於取得 pixel redistribution permission；本專案另取得使用者授權，範圍限定為 GitHub／GitHub Pages review 使用的低解析度衍生 POC：

- `APPROVED`：1944／1945／1958 z12 mosaic、valid mask、Smart Composite、source mask 與 manifest。
- `LOCAL ONLY`：z15–z17 higher-zoom tiles／mosaics、含航照像素的 benchmark screenshots。
- `BLOCKED — RIGHTS UNCLEAR`：廈門八張候選 JPEG；它們仍未完成來源與 GCP registration QA。

公開 bundle 只提交已授權的低解析度 derived assets，不提交原始 WMTS tile、原始高解析度檔或尚未授權的廈門像素。

廈門八張使用者 JPEG 的日期、館藏與公開再散布權均未確認，因此已自 Git 移除 pixels，實體只保留在 .local/aerial-poc/xiamen/。GitHub 的 public/research/xiamen-1943/ 僅保留 manifest、README 與 provenance／SHA-256／dimensions；UI 在 production 或 local pixel 不存在時顯示 graceful fallback，不渲染 broken image。

## 9A. 實際 browser evidence

由 Chrome headless actual page output 於 2026-09-15 重新擷取；安全截圖已進 Git：

- P0/P1：docs/2.0/screenshots/gate-a3p/A3P_P0_BASELINE.png、A3P_P1_ENVIRONMENT.png
- Ocean before/after：A3P_OCEAN_BASELINE.png、A3P_OCEAN_ENHANCED.png
- Daylight/Dawn：A3P_DAYLIGHT_T0.png、A3P_DAWN_T1.png
- Coverage：A3P_COVERAGE_MASK.png
- P1 performance：A3P_PERFORMANCE_DEBUG.png、A3P_P1_DEBUG.png

1944、1945、1958、Smart Composite、P2/P3、source map、Cloud T0/T1 的畫面仍放在 `.local/aerial-poc/screenshots/gate-a3p/`，不提交 GitHub，以控制 repository 與 Pages 流量。GitHub 只提供可由 `aerial=local` 明確載入的低解析度 z12 資產。

## 10. 本報告對 Gate A.3P 的判定

- 1944：PARTIAL；有效且對部分 tile 勝過 1945，但透明缺值比例高。
- 1945：USEFUL；本 POC 的 primary coverage 最穩定。
- 1958：USEFUL FALLBACK；缺值回退有實際作用，但不能當 1949 primary。
- Smart composite：PROMISING；已展示多年代與 BASE 分布，但仍需更大範圍、控制點與權利確認。
- 覆蓋範圍、年度切換、source-year mask、actual Three.js DEM projection、Enhanced Ocean、Clouds、Cloud Shadows、Unified Sun、Atmosphere 與 P0/P1/P2/P3 browser evidence 已在 Gate A.3P 原型接通。
- Gate A.3P 本輪停在此處；不進 Gate B。廈門仍是 EVIDENCE / GEOREGISTRATION RESEARCH，single-image GCP QA 尚未通過。

## 11. Gate A.3P.1 fixed-camera art review binding

2026-09-16 完成既有 A3P pipeline 的 local visual tuning，不新增資料產品，也不改變 KML／registry 的 provenance 結論：

- fixed camera：`ART_REVIEW_KINMEN_XIAMEN_01`，query alias `camera=art-review-kinmen-xiamen-01`。
- 1944／1945／1958 KML registry、coverage outline、source-year mask、year switching 與 1944／1945 Smart Composite 仍由既有 pipeline 提供；1958 只作 missing-data fallback。
- browser review 另驗證 Enhanced Ocean、Cloud、Cloud Shadow、Unified Sun、Atmosphere 以及 P0/P1/P2/P3；A3P.1 截圖分為 GitHub-safe 與 `.local`。
- safe screenshots：`docs/2.0/screenshots/gate-a3p1/`；aerial pixels／source map／opacity／relief matrix：`.local/aerial-poc/screenshots/gate-a3p1/`。
- 本輪沒有把 Xiamen 八張影像接入 Kinmen terrain projection；Xiamen 仍停在 single-image GCP candidate workflow。

## 11. Gate A.3P.1 fixed-camera art review binding

2026-09-16 完成既有 A3P pipeline 的 local visual tuning，不新增資料產品，也不改變 KML／registry 的 provenance 結論：

- fixed camera：`ART_REVIEW_KINMEN_XIAMEN_01`，query alias `camera=art-review-kinmen-xiamen-01`。
- 1944／1945／1958 KML registry、coverage outline、source-year mask、year switching 與 1944／1945 Smart Composite 仍由既有 pipeline 提供；1958 只作 missing-data fallback。
- browser review 另驗證 Enhanced Ocean、Cloud、Cloud Shadow、Unified Sun、Atmosphere 以及 P0/P1/P2/P3；A3P.1 截圖分為 GitHub-safe 與 `.local`。
- safe screenshots：`docs/2.0/screenshots/gate-a3p1/`；aerial pixels／source map／opacity／relief matrix：`.local/aerial-poc/screenshots/gate-a3p1/`。
- 本輪沒有把 Xiamen 八張影像接入 Kinmen terrain projection；Xiamen 仍停在 single-image GCP candidate workflow。
