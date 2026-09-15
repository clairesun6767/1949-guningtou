# Gate A.3P — KML 歷史航照管線報告

審查日期：2026-09-15（Asia/Taipei）

本報告記錄 1944、1945、1958 三份使用者提供 KML 的實際解析、低量本機 POC、品質分析與 smart source mask。POC 僅供本機評估；航照像素、拼接圖與含受限像素的畫面放在 root .local/aerial-poc/ 並被 .gitignore 排除；GitHub 只保留 KML metadata、程式、測試、報告與安全截圖。

## 結論

- 三份 KML 均已在使用者 Downloads 找到，並由同一個 HistoricalAerialKmlParser 解析。
- KML 的 GroundOverlay/Icon 是 1×1 GIF 佔位圖；實際 tile 入口取自 gx:MapTilePyramid／Link，不把 Icon 當航照。
- 1944、1945 都登記為 PRIMARY；1958 登記為 FALLBACK，即使 1958 的區域性 sharpness 較高，也不得覆寫仍有效的 1944／1945 historical information。
- 古寧頭優先 POC 在 z12 只請求 12 張 tile，總下載 650,525 bytes，低於 128 tiles／50 MB 上限。
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
- east 118.372
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
| 1944 | READY | 4 | 4 | 183,943 | 512×512 |
| 1945 | READY | 4 | 4 | 217,721 | 512×512 |
| 1958 | READY | 4 | 4 | 248,861 | 512×512 |
| 合計 | withinBudget=true | 12 | 12 | 650,525 | smart 512×512 |

三年代的 tile range 都是 z12、x 3393–3394、y 1760–1761。Smart composite 使用 tile-level primary ordering，再逐像素處理透明缺值；1958 只在兩個 primary 都沒有有效像素時使用，剩餘位置標為 BASE。

## 5. 品質分析

品質訊號包含 sharpness、contrast、entropy、alpha-valid ratio、information density 與 valid-pixel ratio。各訊號先限制在 0–1，再對本次 dataset set 的 raw score 做 min-max normalization；本次 raw score 範圍為 0.349544–0.640933。

| 年代 | normalized score | sharpness | contrast | entropy | alpha valid | information density | valid pixels |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1944 | 0.27115 | 0.15568 | 0.42594 | 0.87841 | 0.30573 | 0.64681 | 0.30573 |
| 1945 | 0.41800 | 0.10257 | 0.47447 | 0.88837 | 0.53115 | 0.66749 | 0.53115 |
| 1958 | 0.55152 | 0.36785 | 0.35715 | 0.73791 | 0.65319 | 0.54315 | 0.65319 |

本表是這次 4-tile 古寧頭 POC 的量測，不是整島品質結論。1958 的 sharpness 與 valid-pixel ratio 較高，但 historical date 較晚，所以仍固定為 fallback。

## 6. 1944／1945 primary 選擇

四個共同 tile 的 normalized tile score 比較：

- 1944 優於 1945：z12／x3393／y1761。
- 1945 優於 1944：z12／x3393／y1760、x3394／y1760、x3394／y1761。
- 1958 在這個小樣本的 sharpness 較高，但不參與 primary overwrite。

因此 renderer 使用 quality-aware primary selection，而不是固定「1945 永遠覆蓋 1944」。在透明缺值位置才進入 1958 fallback，再退回現代 DEM base。

## 7. Smart composite 與來源分布

smart-composite-z12.png 與 source-mask-z12.png 都只存在 .local/aerial-poc/；Git 不追蹤它們。

| source | 實際像素比例 |
| --- | ---: |
| 1944 | 13.21% |
| 1945 | 52.99% |
| 1958 fallback | 11.01% |
| Historical Base／現代 DEM | 22.79% |
| Xiamen historical source | 0%（本 Gate 尚無已驗證來源） |

這個比例只適用於本次 512×512 古寧頭 POC mosaic；不可外推為金門全域比例。

## 8. Three.js 投影與 truth boundary

航照不是 DOM overlay，也不是 CSS 背景。Layer 會以 geographic bounds 計算 terrain UV bounds，將 texture 綁到 Three.js DEM surface；Aerial 不被當作 height map。現代 DEM 與現代 OSM 海岸線仍標示為 MODERN REFERENCE，航照標示為 HISTORICAL AERIAL。

目前對齊狀態：

TILE-BOUND ALIGNED / NOT VERIFIED ORTHORECTIFIED

原因是本 POC 尚未提供可重現的地面控制點、RMSE 或可靠的航照外方位參數。不能把 tile bounds 誤寫成完美正射校正。

## 9. Rights 與提交邊界

KML／WMTS 公開可讀不等於取得 pixel redistribution permission。本次 manifest、tile cache、mosaic、smart texture 與含航照像素截圖均維持：

- BLOCKED — RIGHTS UNCLEAR
- LOCAL POC — NOT REDISTRIBUTABLE

可提交 GitHub 的只有 parser、registry、provider、quality analyzer、selection/source-mask API、coverage geometry、UI、tests、reports 與不含受限像素的安全畫面。

廈門八張使用者 JPEG 的日期、館藏與公開再散布權均未確認，因此已自 Git 移除 pixels，實體只保留在 .local/aerial-poc/xiamen/。GitHub 的 public/research/xiamen-1943/ 僅保留 manifest、README 與 provenance／SHA-256／dimensions；UI 在 production 或 local pixel 不存在時顯示 graceful fallback，不渲染 broken image。

## 9A. 實際 browser evidence

由 Chrome headless actual page output 於 2026-09-15 重新擷取；安全截圖已進 Git：

- P0/P1：docs/2.0/screenshots/gate-a3p/A3P_P0_BASELINE.png、A3P_P1_ENVIRONMENT.png
- Ocean before/after：A3P_OCEAN_BASELINE.png、A3P_OCEAN_ENHANCED.png
- Daylight/Dawn：A3P_DAYLIGHT_T0.png、A3P_DAWN_T1.png
- Coverage：A3P_COVERAGE_MASK.png
- P1 performance：A3P_PERFORMANCE_DEBUG.png、A3P_P1_DEBUG.png

1944、1945、1958、Smart Composite、P2/P3、source map、Cloud T0/T1 的畫面含 local Kinmen pixels，全部放在 .local/aerial-poc/screenshots/gate-a3p/，不提交 GitHub。每次截圖的 query、privacy 與 byte size 見兩個 screenshot manifest.json。

## 10. 本報告對 Gate A.3P 的判定

- 1944：PARTIAL；有效且對部分 tile 勝過 1945，但透明缺值比例高。
- 1945：USEFUL；本 POC 的 primary coverage 最穩定。
- 1958：USEFUL FALLBACK；缺值回退有實際作用，但不能當 1949 primary。
- Smart composite：PROMISING；已展示多年代與 BASE 分布，但仍需更大範圍、控制點與權利確認。
- 覆蓋範圍、年度切換、source-year mask、actual Three.js DEM projection、Enhanced Ocean、Clouds、Cloud Shadows、Unified Sun、Atmosphere 與 P0/P1/P2/P3 browser evidence 已在 Gate A.3P 原型接通。
- Gate A.3P 本輪停在此處；不進 Gate B。廈門仍是 EVIDENCE / GEOREGISTRATION RESEARCH，single-image GCP QA 尚未通過。
