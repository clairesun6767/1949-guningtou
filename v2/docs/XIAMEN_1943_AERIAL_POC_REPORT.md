# 廈門二戰時期航照候選資料 — Single-image registration POC

> 報告日期：2026-09-15（Asia/Taipei）
> 專案：1949 古寧頭 2.0 — Gate A.3P
> Git 分支：feature/2.0-art-region-environment-poc

## 1. 結論與資料真實性

這八張廈門影像目前只能作：

EVIDENCE / GEOREGISTRATION RESEARCH

它們不是已驗證的 1943–1945 historical aerial dataset，也沒有進入 Kinmen 1944／1945／1958 renderer、mosaic 或 terrain projection。

| 欄位 | 目前值 |
| --- | --- |
| Dataset ID | XIAMEN_WWII_AERIAL_UNVERIFIED_01 |
| UI | 廈門二戰時期航照候選資料 |
| claimedDate | 1943-11-22（使用者提供的 claim） |
| verifiedDate | null |
| UI status | DATE UNVERIFIED |
| provenance clue | 影像上保留 53-8-12、53-8-20 兩個可辨識字串；本報告不自行解讀 |
| rights | BLOCKED — RIGHTS UNCLEAR |
| alignment | NOT ORTHORECTIFIED |
| applicationMode | EVIDENCE / GEOREGISTRATION RESEARCH |

先前曾出現 1944 的工作標籤，後由使用者更正為 1943-11-22；這段只作 provenance history，不等於 verifiedDate。

## 2. Rights boundary 與檔案治理

- 八張 JPEG 已從 Git repository 移除 pixels。
- 本機像素位置：.local/aerial-poc/xiamen/
- GitHub metadata 位置：public/research/xiamen-1943/
- 公開 manifest 保存：ID、label、claimedDate、verifiedDate=null、dateStatus、literal clues、dimensions、bytes、SHA-256、source registry 與 georegistration state。
- public/research/xiamen-1943/README.md 說明 local-only policy；public/research/xiamen-1943/ 不再含 JPEG。
- astro dev 只在本機提供 /.local/aerial-poc/ 路由，並限制在 root .local/aerial-poc 內；static build 不複製 ignored pixels。
- local asset 可用時 UI 顯示預覽；不存在、production 或 onError 時顯示 LOCAL PIXEL NOT FOUND，不留下 broken image。

八張影像維持上傳順序：A-01–A-05 為第一批，B-01–B-03 為後續三張。逐張檔名、960×1280 dimensions、bytes 與 SHA-256 以 metadata manifest 和 TypeScript registry 為準。

## 3. Archival reverse lookup

依指定順序的目前結果：

### 第一優先：NHHC — Milton E. Miles Collection

NHHC UA 25.01 的 Box 17／S-2 目錄列出 panoramic of Amoy & Kulangsu，是最接近本批主題的館藏 lead。逐張 negative、print、frame、envelope 與日期尚未取得，不能把目錄 lead 當作八張影像的 provenance proof。

來源：https://www.history.navy.mil/our-collections/photography/alphabetical---donations0/m/ua-25-01-radm-milton-e--miles-collection.html

### 第二優先：NARA RG 373／24N118E

RG 373 JX 的 degree-square target 記為 24N118E／Amoy／Hsia-men／Kulangsu。公開指南要求從 overlay 追 flight、date、mission、spot、exposure，再對到 film can；本次尚未取得任何可核對本批影像的 identifier。

來源：https://www.archives.gov/research/cartographic/aerial-photography/rg-373-jx-foreign-aerial-photography

### 第三優先：USAAF 14th Air Force／21st PRS

公開中國戰區航照副本可用來反查中隊題註、座標格式與影像外觀；尚未找到本批廈門影像的 exact flight、mission、frame 或 print number。

來源：https://www.hpcbristol.sjtu.edu.cn/visual/bi-s119

### 第四優先：Flickr／Wikimedia／Internet Archive

目前沒有找到能反推出本批影像原始館藏編號的 matching public copy。Wikimedia 的 Amoy, from Kulangseu 是 1885 圖像，不作二戰航照證明。

來源：https://commons.wikimedia.org/wiki/Category:Aerial_photographs_of_Xiamen

### 第五優先：1946 HSIA-MEN 1:12,500

Amoy_12500_1946 是中研院歷史地圖候選，可作沒有航照區域的 Tier B cartographic fallback；不是本八張航照，也不綁定到本 Dataset。

來源：https://gis.sinica.edu.tw/southeast_coast/

目前下列欄位全部維持 NONE VERIFIED：flight、mission、frame、spot、exposure、film can、negative／print number、exact date。完整研究矩陣見 XIAMEN_1943_1946_AERIAL_SOURCE_RESEARCH.md。

## 4. GCP candidate workflow

第一張實驗影像固定選 A-01：amoy-1943-11-22-set-a-01。候選點只表示影像 pixel coordinate 與觀察，不是已核對的地理控制點：

| candidate | approximate pixel | observation | target lon/lat | confidence |
| --- | ---: | --- | --- | --- |
| Xiamen coastline | 871,330 | 水陸界線候選 | null | low |
| harbor | 805,520 | 港灣邊緣候選 | null | low |
| major bay | 740,845 | 海灣轉折候選 | null | low |
| persistent landmark | 288,694 | 大型固定構造物候選 | null | medium |
| road corridor | 470,535 | 道路走廊候選 | null | low |
| Gulangyu／islands | B-03／126,1020 | 島嶼候選觀察 | null | low |

reference source 暫以 1946 HSIA-MEN 1:12,500／Amoy_12500_1946 加現代 coastline cross-check；這只作研究參照，不把地圖候選當作 aerial verification。

Registration QA 規則：

- 至少 4 個已核對 reference targets。
- 每個 residual 不大於 8 pixels。
- 點位需有足夠空間分布，不能集中在同一條海岸線。
- QA pass 前不研究 mosaic、不做 terrain projection。

目前 verified target count=0、residuals 為空、qaStatus=NOT PASSED、mosaicAllowed=false、terrainProjectionAllowed=false。參數與 workflow 位於 v2/config/xiamenGcpWorkflow.ts；UI 以 GCP CANDIDATE WORKFLOW／A-01 SINGLE IMAGE／BLOCKED 顯示。

## 5. Gate A.3P 主原型已完成的相關部分

廈門影像沒有進入主地圖，但本輪 Gate A.3P 其餘 pipeline 已接通：

- 1944／1945／1958 metadata-only KML mirrors：public/research/kinmen-kml/
- HistoricalAerialDatasetRegistry、coverage outline、year switching。
- 1944／1945 smart composite，1958 missing-data fallback，source-year mask。
- actual Three.js DEM terrain projection：以 geographic bounds 產生 UV，航照不當 height map。
- Enhanced Ocean、Clouds、Cloud Shadows、Unified Sun、Atmosphere。
- P0／P1／P2／P3 environment benchmark 與 local/public screenshot 分流。

詳細管線見 GATE_A3P_KML_AERIAL_PIPELINE_REPORT.md；環境與性能見 GATE_A3P_ENVIRONMENT_BENCHMARK_REPORT.md。

## 6. 實際 browser evidence 與 privacy

Chrome headless actual page output 已於 2026-09-15 重新擷取：

安全、可提交 GitHub 的截圖：

- docs/2.0/screenshots/gate-a3p/A3P_P0_BASELINE.png
- docs/2.0/screenshots/gate-a3p/A3P_P1_ENVIRONMENT.png
- docs/2.0/screenshots/gate-a3p/A3P_OCEAN_BASELINE.png
- docs/2.0/screenshots/gate-a3p/A3P_OCEAN_ENHANCED.png
- docs/2.0/screenshots/gate-a3p/A3P_DAYLIGHT_T0.png
- docs/2.0/screenshots/gate-a3p/A3P_DAWN_T1.png
- docs/2.0/screenshots/gate-a3p/A3P_COVERAGE_MASK.png
- docs/2.0/screenshots/gate-a3p/A3P_PERFORMANCE_DEBUG.png
- docs/2.0/screenshots/gate-a3p/A3P_P1_DEBUG.png

含 local Kinmen pixels 的截圖全部為 LOCAL ONLY：

- .local/aerial-poc/screenshots/gate-a3p/A3P_H1_1944_LOCAL.png
- .local/aerial-poc/screenshots/gate-a3p/A3P_H2_1945_LOCAL.png
- .local/aerial-poc/screenshots/gate-a3p/A3P_H3_1958_LOCAL.png
- .local/aerial-poc/screenshots/gate-a3p/A3P_H4_SMART_LOCAL.png
- .local/aerial-poc/screenshots/gate-a3p/A3P_SOURCE_DISTRIBUTION_LOCAL.png
- .local/aerial-poc/screenshots/gate-a3p/A3P_P2_LOCAL.png
- .local/aerial-poc/screenshots/gate-a3p/A3P_P3_LOCAL.png
- .local/aerial-poc/screenshots/gate-a3p/A3P_CLOUD_T0_LOCAL.png
- .local/aerial-poc/screenshots/gate-a3p/A3P_CLOUD_T1_LOCAL.png

上述 local screenshots 不含廈門八張 JPEG；廈門 rights-unclear pixels 只存在 .local/aerial-poc/xiamen/，不進任何 GitHub screenshot。

## 7. QA 結果

- npm.cmd run test:v2：40／40 passed。
- npm.cmd run build：280 pages built。
- clean Astro dev browser QA：無 hydration、broken image、404 或 failed-to-fetch log。
- LOCAL Smart Composite debug：60 FPS、CPU frame 約 16.7 ms、5 calls、469,026 triangles、512×512、12 tiles、650,525 bytes；source distribution 為 1944 13.21%、1945 52.99%、1958 11.01%、BASE 22.79%。
- GCP registration QA：BLOCKED，尚未通過。

## 8. Gate boundary

本次停在 Gate A.3P，不進 Gate B。下一次涉及廈門的合法進展必須先完成 archival reverse lookup 或取得可書面確認的使用權，再以 A-01 的 single-image registration QA 驗證；QA 通過後才可評估 mosaic／terrain projection。
