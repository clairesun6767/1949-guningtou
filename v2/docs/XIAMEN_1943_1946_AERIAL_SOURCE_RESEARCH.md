# Xiamen 1943–1946 Historical Source Research

審查日期：2026-09-15（Asia/Taipei）

## Executive finding

本次沒有找到可直接驗證、可合法作為本專案 runtime historical aerial texture 的廈門 1943–1945 航照像素。結論為：

XIAMEN：MAP ONLY / NO USABLE SOURCE YET

不能用 modern satellite、現代 DEM 或網路上未驗證的 JPG 冒充 1943–1945 historical aerial。1946 HSIA-MEN 是可追蹤的歷史地圖候選，屬 Tier B cartographic reference，不是 Tier A aerial texture。

## 0. Dataset truth state

目前 UI 與 metadata 的唯一識別為：

- ID：XIAMEN_WWII_AERIAL_UNVERIFIED_01
- UI label：廈門二戰時期航照候選資料
- claimedDate：1943-11-22（使用者提供的 claim，非驗證日期）
- verifiedDate：null
- dateStatus：DATE UNVERIFIED
- literal provenance clues：53-8-12、53-8-20（保留字串，不自行解讀）
- applicationMode：EVIDENCE / GEOREGISTRATION RESEARCH
- rightsStatus：BLOCKED — RIGHTS UNCLEAR

八張 JPEG 已從 Git repository 移除，僅保留在 root .local/aerial-poc/xiamen/。公開 repository 只保存 manifest metadata、SHA-256、dimensions、source registry、GCP workflow 與報告。

## 1. Official sources checked

| Source | Observed evidence | Access／rights decision |
| --- | --- | --- |
| 中央研究院東南沿海百年歷史地圖 | 官方清單列出 Amoy_10K_1938、Amoy_12500_1946、Amoy_1938 等 layer IDs，並提供 southeast_coast WMTS endpoint | 可作 source metadata；像素／衍生材質仍需確認授權 |
| 中研院 1946 candidate | Layer ID：Amoy_12500_1946；名稱：1946 HSIA-MEN [12500] | Tier B candidate；本 Gate 不下載、不綁定 renderer |
| 中研院 Gulangyu candidate | Layer ID：Amoy_1938；名稱：MAP OF KULANGSU ISLAND AMOY；官方 metadata bounds 118.0514827–118.0734196E、24.4384177–24.4566086N | 1938 map reference，非 1943–1946 aerial |
| NARA RG 373 JX | 官方說明：JX 約 1933–1945 的日軍 foreign aerial photography；overlay index 以 degree square 搜尋，overlay 上可找 flight／date／mission／spot | 只建立 research lead；尚未取得 24N118E 的 spot／frame／can identifier |
| NHHC UA 25.01／Milton E. Miles Collection | Box 17／S-2 目錄列出 panoramic of Amoy & Kulangsu | 最接近 Amoy／Kulangsu 主題的 archival lead；尚未核對逐張 negative／print／frame 或再散布權 |
| USAAF 14th Air Force／21st Photographic Reconnaissance Squadron | 公開中國戰區航照副本可用題註格式與中隊名稱反查 | 方法學 lead；尚未找到本八張的 exact flight／mission／frame／spot |
| Academia Sinica JX research lead | 中研院研究文章說明 JX 典藏與索引碼、航跡圖與底片罐對應研究 | 可作 archival lead；不是本專案已取得的影幅或再散布授權 |

官方頁面：

- <https://gis.sinica.edu.tw/southeast_coast/>
- <https://gis.sinica.edu.tw/showwmts/index.php?l=Amoy_12500_1946&s=southeast_coast>
- <https://gis.sinica.edu.tw/showwmts/index.php?l=Amoy_10K_1938&s=southeast_coast>
- <https://gis.sinica.edu.tw/showwmts/index.php?l=Amoy_1938&s=southeast_coast>
- <https://www.archives.gov/research/cartographic/aerial-photography/rg-373-jx-foreign-aerial-photography>
- <https://www.history.navy.mil/our-collections/photography/alphabetical---donations0/m/ua-25-01-radm-milton-e--miles-collection.html>
- <https://www.hpcbristol.sjtu.edu.cn/visual/bi-s119>
- <https://gis.rchss.sinica.edu.tw/GIArchive/archives/1841/>

1946 layer 的官方清單項目已確認；其個別 metadata 頁在本次自動讀取時出現 cache miss，因此 bounds、preview、WMTS capabilities、實際解析度與下載權利不填猜測值，留待人工／官方回覆核對。

## 2. Area-by-area candidate matrix

欄位含義：Archive／Collection／Flight／Frame／Identifier／Resolution／Georeferenced／Digitized／Preview／Rights／Download／High-res application／Production suitability／Confidence。

### Xiamen Island

| 年代／問題 | 實際判定 |
| --- | --- |
| 1943 aerial? | 未驗證；沒有取得 flight、frame 或 NARA identifier。 |
| 1944 aerial? | 未驗證；NARA JX 24N118E 只是研究搜尋入口，不是 coverage proof。 |
| 1945 aerial? | 未驗證；沒有取得可綁定的影幅或合法高解析檔。 |
| 1946 historical map? | 有候選：中研院 Amoy_12500_1946，1946 HSIA-MEN [12500]，Tier B。 |
| Archive／collection | 中研院東南沿海百年歷史地圖 WMTS；NARA RG 373 JX 是待查 aerial archive。 |
| Flight／frame／identifier | Sinica map layer ID 已知；NARA flight／frame／spot 未知。 |
| Resolution | map candidate 名稱含 1:12,500；原始掃描解析度與 GSD 未驗證。 |
| Georeferenced／digitized／preview | WMTS service indicates a tiled geographic layer；individual 1946 metadata page尚未完成核對。 |
| Rights／download／high-res application | 未取得明確允許 GitHub、runtime、衍生材質或商業再散布的書面授權。 |
| Local POC／production | 僅可作 metadata lead；不作本 Gate pixel POC，不進 production。 |
| Confidence | 1946 layer existence：HIGH；詳細 spatial／rights：LOW；1943–45 aerial：NONE。 |

### Gulangyu／Kulangsu

| 年代／問題 | 實際判定 |
| --- | --- |
| 1943／1944／1945 aerial? | 未找到已驗證可用航照。 |
| 1946 historical map? | 未找到 Gulangyu 專屬 1946 map；有 1938 MAP OF KULANGSU ISLAND AMOY。 |
| Archive／identifier | 中研院 southeast_coast；Amoy_1938。 |
| Verified metadata | format PNG、profile mercator、zoom 0–19；bounds west 118.0514827、south 24.4384177、east 118.0734196、north 24.4566086。 |
| Rights／download／production | 頁尾保留中研院版權聲明；非經允許不得作商業使用。未取得衍生／再散布許可。 |
| Confidence | 1938 map metadata：HIGH；1943–46 aerial：NONE。 |

### Dadeng／大嶝

| 年代／問題 | 實際判定 |
| --- | --- |
| 1943／1944／1945 aerial? | 未找到可驗證 flight／frame／identifier 或合法影幅。 |
| 1946 historical map? | 沒有找到 Dadeng 專屬 layer ID；不能由 Amoy general map 推論局部 coverage。 |
| Archive／preview／resolution | 未驗證。 |
| Rights／local POC／production | 未確認；不下載、不綁定、不生成 fake coverage。 |
| Confidence | NONE。 |

### Xiaodeng／小嶝

| 年代／問題 | 實際判定 |
| --- | --- |
| 1943／1944／1945 aerial? | 未找到可驗證 flight／frame／identifier 或合法影幅。 |
| 1946 historical map? | 沒有找到 Xiaodeng 專屬 layer ID；不能把 general coastal map 當成島嶼專屬 historical layer。 |
| Archive／preview／resolution | 未驗證。 |
| Rights／local POC／production | 未確認；不下載、不綁定、不生成 fake coverage。 |
| Confidence | NONE。 |

## 3. NARA research state

NARA 官方 RG 373 JX 流程要求先用 degree-square overlay index，再由 overlay 上的 flight／date／mission／spot／exposure 對應 film can。此 Gate 的研究目標是 24N118E，而不是找一張網路 JPG。

目前可報告的 identifiers：

- Collection／series：RG 373，Aerial Photographs, 1935–1970，Japanese Flown Foreign Aerial Photography（JX）。
- Degree-square research target：24N118E。
- NARA NAID：本次未驗證。
- Flight／mission／frame／spot／exposure／film can：本次未驗證。

因此 NARA Identifiers 欄位必須填「NONE VERIFIED」，不能填入範例頁面上的其他 degree square、spot 或 can number。

## 3A. Archival reverse-lookup status

| 目標欄位 | NHHC UA 25.01 | NARA RG 373／24N118E | USAAF 14th／21st PRS |
| --- | --- | --- | --- |
| flight | NONE VERIFIED | NONE VERIFIED | NONE VERIFIED |
| mission | NONE VERIFIED | NONE VERIFIED | NONE VERIFIED |
| frame | NONE VERIFIED | NONE VERIFIED | NONE VERIFIED |
| spot | NONE VERIFIED | NONE VERIFIED | NONE VERIFIED |
| exposure | NONE VERIFIED | NONE VERIFIED | NONE VERIFIED |
| film can | NONE VERIFIED | NONE VERIFIED | NONE VERIFIED |
| negative／print number | NONE VERIFIED | NONE VERIFIED | NONE VERIFIED |
| exact date | 目錄未列；不能由 claim 推回 | NONE VERIFIED | 公開副本未證明本批廈門影像 |

NHHC 的 Box 17／S-2「panoramic of Amoy & Kulangsu」只能證明值得索取館藏清單；NARA 的 24N118E 只能證明搜尋入口；USAAF 公開頁只能提供反查題註的方法。三者目前都不足以把八張 JPEG 轉成 verified dataset。

## 3B. Single-image GCP candidate workflow

第一張實驗影像固定選 A-01：amoy-1943-11-22-set-a-01。候選只記錄影像 pixel coordinate 與觀察，不把 target longitude／latitude 填成已驗證點：

- Xiamen coastline／水陸界線
- harbor／港灣邊緣
- major bay／海灣轉折
- persistent landmark／大型固定構造物
- road corridor／道路走廊
- Gulangyu／islands：只列 B-03 的候選觀察，不作確認

目前 verified target count 為 0，沒有 residual measurement；registration QA 為 BLOCKED。規則是至少 4 個已核對 reference targets、每個 residual 不大於 8 pixels 且分布足夠，才允許研究 mosaic；QA 通過前不做 mosaic、不做 terrain projection。參數與候選座標保存在 v2/config/xiamenGcpWorkflow.ts，UI 以 GCP CANDIDATE WORKFLOW 顯示。

## 4. Tier decision

- Tier A：目前沒有已驗證的 Xiamen 1943–1945 aerial dataset。
- Tier B：Amoy_12500_1946 可作歷史地圖候選；1938 Amoy／Kulangsu map 可作更早的 cartographic context。
- Tier C：WWII Amoy target map 只保留為未驗證 military-intelligence research lead，不當 aerial texture。
- Tier D：modern DEM／OSM 只保留 modern geographic reference。

## 5. Recommendation

繼續搜尋／申請廈門 aerial：YES。

下一步應向 NHHC、NARA、USAAF／Air Force records 與中研院提出具體詢問，要求 flight、mission、frame／spot、exposure、film-can、negative／print number、digitization status、reproduction fee、high-resolution application 與 derivative／public-web rights。取得書面確認前，Xiamen 只顯示 source coverage／research state，不產生 historical texture。

## 6. Gate A.3P.1 boundary confirmation

2026-09-16 的 Gate A.3P.1 browser art review 沿用本研究的 rights boundary：NHHC UA 25.01、NARA RG 373／24N118E、USAAF 14th Air Force／21st PRS 仍沒有補足 flight、mission、frame、spot、exposure、film can、negative／print number 或 exact date 的 verified chain。故本輪不改寫日期、不把八張 JPEG 轉為 public historical dataset。

廈門影像只允許在 `.local/aerial-poc/xiamen/` 作 EVIDENCE／GEOREGISTRATION RESEARCH；下一步仍是 A-01 single-image GCP candidate review，必須先以至少四個可核對 reference target、residual ≤ 8 pixels 的 QA 規則通過，才可研究 mosaic。Gate A.3P.1 的安全瀏覽器截圖與報告不含這些像素。
