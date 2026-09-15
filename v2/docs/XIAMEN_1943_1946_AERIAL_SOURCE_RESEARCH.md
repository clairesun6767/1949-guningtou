# Xiamen 1943–1946 Historical Source Research

審查日期：2026-09-15（Asia/Taipei）

## Executive finding

本次沒有找到可直接驗證、可合法作為本專案 runtime historical aerial texture 的廈門 1943–1945 航照像素。結論為：

XIAMEN：MAP ONLY / NO USABLE SOURCE YET

不能用 modern satellite、現代 DEM 或網路上未驗證的 JPG 冒充 1943–1945 historical aerial。1946 HSIA-MEN 是可追蹤的歷史地圖候選，屬 Tier B cartographic reference，不是 Tier A aerial texture。

## 1. Official sources checked

| Source | Observed evidence | Access／rights decision |
| --- | --- | --- |
| 中央研究院東南沿海百年歷史地圖 | 官方清單列出 Amoy_10K_1938、Amoy_12500_1946、Amoy_1938 等 layer IDs，並提供 southeast_coast WMTS endpoint | 可作 source metadata；像素／衍生材質仍需確認授權 |
| 中研院 1946 candidate | Layer ID：Amoy_12500_1946；名稱：1946 HSIA-MEN [12500] | Tier B candidate；本 Gate 不下載、不綁定 renderer |
| 中研院 Gulangyu candidate | Layer ID：Amoy_1938；名稱：MAP OF KULANGSU ISLAND AMOY；官方 metadata bounds 118.0514827–118.0734196E、24.4384177–24.4566086N | 1938 map reference，非 1943–1946 aerial |
| NARA RG 373 JX | 官方說明：JX 約 1933–1945 的日軍 foreign aerial photography；overlay index 以 degree square 搜尋，overlay 上可找 flight／date／mission／spot | 只建立 research lead；尚未取得 24N118E 的 spot／frame／can identifier |
| Academia Sinica JX research lead | 中研院研究文章說明 JX 典藏與索引碼、航跡圖與底片罐對應研究 | 可作 archival lead；不是本專案已取得的影幅或再散布授權 |

官方頁面：

- <https://gis.sinica.edu.tw/southeast_coast/>
- <https://gis.sinica.edu.tw/showwmts/index.php?l=Amoy_12500_1946&s=southeast_coast>
- <https://gis.sinica.edu.tw/showwmts/index.php?l=Amoy_10K_1938&s=southeast_coast>
- <https://gis.sinica.edu.tw/showwmts/index.php?l=Amoy_1938&s=southeast_coast>
- <https://www.archives.gov/research/cartographic/aerial-photography/rg-373-jx-foreign-aerial-photography>
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

## 4. Tier decision

- Tier A：目前沒有已驗證的 Xiamen 1943–1945 aerial dataset。
- Tier B：Amoy_12500_1946 可作歷史地圖候選；1938 Amoy／Kulangsu map 可作更早的 cartographic context。
- Tier C：WWII Amoy target map 只保留為未驗證 military-intelligence research lead，不當 aerial texture。
- Tier D：modern DEM／OSM 只保留 modern geographic reference。

## 5. Recommendation

繼續搜尋／申請廈門 aerial：YES。

下一步應向 NARA／中研院提出具體詢問，要求 24N118E overlay 上的 flight、mission、frame／spot、exposure、film-can、digitization status、reproduction fee、high-resolution application 與 derivative／public-web rights。取得書面確認前，Xiamen 只顯示 source coverage／research state，不產生 historical texture。
