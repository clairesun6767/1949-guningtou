# 《昔日戰場・今日古寧頭》V3.0 基準稽核

稽核日期：2026-10-19（Asia/Taipei）  
稽核分支：`feature/guningtou-then-now-v2`  
基準 commit：`604721497d4f8628ed61c819bc353b5995351e10`

## 0. 執行邊界

本文件是 V3.0 修改前的只讀基準。V3 附件文字在第 11 節「第二區：戰」標題處截斷，後續規格未包含在可讀檔案內；本輪只依附件中可確認的第 0–10 節執行，不自行補寫缺失規格。

本輪受保護範圍：

- `BattlefieldEngine`、Timeline、event/unit runtime、camera 與 renderer architecture
- `data/battles/guningtou-1949/` 既有 canonical locations、terrain、battle movement、route geometry、historical traces
- `data/poi.json` 既有 POI 與既有 location routes
- `data/sources.json` authoritative source registry

預期變更只限於今昔研究資料、媒體來源紀錄、研究頁面與必要的展示 adapter；不把研究結果自動升格成 battle canonical data。

## 1. Git safety gate

| 項目 | 結果 |
| --- | --- |
| branch | PASS — `feature/guningtou-then-now-v2` |
| HEAD | PASS — `604721497d4f8628ed61c819bc353b5995351e10` |
| remote | `origin` → `https://github.com/clairesun6767/1949-guningtou.git` |
| working tree | PASS — clean；與 `origin/feature/guningtou-then-now-v2` 一致 |
| V2 commit | `feat: add Guningtou then and now V2 page` |
| main | 未 checkout、未 merge、未 rebase、未 reset、未 amend |

## 2. V1.2 / V1.3 preservation baseline

基準命令重新執行結果：

| 命令 | 結果 |
| --- | --- |
| `npm run validate:battle-data` | PASS — package/historical errors 0；4 個既有 imagery calibration warnings 保留為 warning；Evidence Gate BLOCKED、qualified 0 |
| `npm run test:battle-data` | PASS — 71/71 |
| `npm run typecheck` | PASS — 0 errors、0 warnings、0 hints；190 files |
| `npm run build` | PASS — Astro static；286 pages |

V2 的 286 pages 相對 V1.3 的 279 pages 增加 7 頁：三個語言的 `then-and-now` 與保留 URL 的 `postwar` 入口（每個語言各一頁，共 6）及既有 V2 route accounting；未發現 renderer 或 battle data regression。

## 3. 現有網站與 V2 架構

| 面向 | 現況 | V3 使用方式 |
| --- | --- | --- |
| framework/output | Astro static + React islands；`base=/1949-guningtou/` | 保持不變 |
| original homepage | `src/pages/[lang]/index.astro` | 保留 1949 戰役首頁；只保留清楚的今昔入口 |
| post-war entry | `src/pages/[lang]/postwar.astro` 轉入 `ThenNowPage` | 保留 URL，補充 research/inventory 展示 |
| named route | `src/pages/[lang]/then-and-now.astro` | 三語言 route 維持 |
| page component | `src/components/then-now/ThenNowPage.astro` | 沿用五區架構；新增 inventory / map-compare adapter 時不重寫 battle renderer |
| catalog | `src/data/thenNowCatalog.ts` | 目前是展示文案與 source links；V3 新增 `data/then-now/site-inventory.json` 作調查資料，不另建 canonical historical DB |
| media | `src/data/mediaCatalog.ts` + `public/media/gun­ing­tou/` | 延用既有 archive media records，新增影像只在授權可追溯時放入 |
| map | `LocationExplorer` + `/map/` 的 `HistoricalMapExperience` | 使用既有 POI/map system；不新增猜測座標、不修改 terrain/trace |
| archive | `/archive/` 由 `mediaCatalog` 顯示 | inventory 的 media provenance 與 archive mediaId 保持可追溯 |

既有 V2 已實作五區：1944 航照參考、影像比較、canonical location exploration、軍事據點活化、聚落／紀念痕跡。V3 的主要缺口是「全區據點盤點」、「地圖並排/定位誠實提示」、「完整官方研究紀錄」與「核心據點影像權利閉環」。

## 4. 歷史與 canonical data audit

| 資料面 | 基準狀態 |
| --- | --- |
| authoritative source registry | 基準為 `data/sources.json` 38 筆；V3 仍沿用同一 registry，完成來源補充後為 55 筆；沒有第二套可編輯 source registry |
| battle package locations | 6 個 canonical locations；不得以今昔 inventory 取代或增加 |
| site index | `data/poi.json` 25 個既有 POI；部分為 estimated/approximate，不能因展示需求升格 |
| events / units | 30 events、25 units（battle adapter baseline） |
| routes | R01–R12 保留於 route audit；0 條 promoted/production route |
| claims | 13 筆 HistoricalClaim，均由既有 evidence/source 系統管理 |
| evidence matrix | 5 個 historical candidates；Evidence Gate BLOCKED；qualified 0 |
| research gaps | 9 個；依 V1.3 保持 OPEN/PARTIAL/BLOCKED，不以合理推測關閉 |
| production | 沒有未經 Evidence Gate 的 production historical event/unit/route |

V3 inventory 的 site ID（例如 `TN-W013`）是「戰後／今昔調查記錄」命名空間，不是 `POI-*`、canonical Location、battle Event 或 route ID；只有已有且可明確對應的既有 POI 才建立 reference，未確定者保留 null。

## 5. 影像與檔案盤點

### 已提交的可追溯公開素材

`public/media/guningtou/then-now/` 基準有 5 張、V3 目前新增 4 張 Wikimedia Commons 影像，均在 `mediaCatalog.ts` 中帶有作者、日期、授權與來源頁：

- 古寧頭戰史館（Mnb，2013，CC BY-SA 4.0）
- 北山斷崖（人人生來平等，2022，CC BY-SA 4.0）
- 北山播音牆（Mnb，2013，CC BY-SA 4.0）
- 北山古洋樓（張雅倫，2018，CC BY-SA 4.0）
- 古寧頭牌坊（Rolfmueller，2012，CC BY-SA 3.0）
- 古寧頭海灘（rheins，2015，CC BY 3.0）
- 李光前將軍廟（rheins，2014，CC BY 3.0）
- 和平紀念園區李氏宗祠（Koala0090，2019，CC BY-SA 4.0）
- 林厝浴血殲敵紀念碑（Koala0090，2019，CC BY-SA 4.0）

另有 archive、人物、地圖、1944/1945/1958 航照與低解析研究素材；`.local/aerial-poc/`、`.hermes/`、`.codex-remote-attachments/` 與原始 DEM/cache 類資料不作公開素材。

### 已知影像缺口

- 尚未有足夠可核權的 W011、W012、W016、W027 現況／內部／修復影像組合。
- 尚未把嚨口二營區、嚨口堡、東一點紅、鎮中堡、李光前將軍廟、和平園區等新研究對象誤配到其他地點照片。
- 1944 航照仍是戰前參考；未完成 GCP/精密套準，不能作為精確 1949 overlay。
- 未經授權的官方網站或搜尋結果圖片不直接下載入 repository；需先確認作者、年份、來源、授權與地點識別。

## 6. `.gitignore` 與敏感資料 gate

基準 `.gitignore` 已排除：`dist/`、`.astro/`、cache/、`.local/aerial-poc/`、`.hermes/`、`.codex-remote-attachments/`、`node_modules/`、`.env`/`.env.*`、log、DEM/GeoTIFF/LAS/LAZ/GPKG/PBF/MBTiles 等大型或原始地理資料。原始上傳路線圖也保持不提交；網站公開使用的複製版本另行管理。

V3 不會提交 `.env`、token、credential、local cache、build output、原始 DEM 或未核權照片。新增 inventory 只含公開來源 URL、研究狀態與 rights 欄位，不含 secrets。

## 7. 第一輪官方研究新增結果（稽核基準）

截至 2026-10-19，已查閱／記錄以下官方入口：

| 主題 | 官方來源 | 基準結論 |
| --- | --- | --- |
| W013 | Taiwan National Parks `26680`、`18475`、`18078` | W013=安東一營區；與 W011/W012 同屬系列；2016 開幕活化，不能把現況直接稱作 1949 原始工事 |
| W027 | Taiwan National Parks `26295`、`18061` | W027=湖下一營區；位於古寧頭烏沙頭，為戰後海防據點；官方記錄公開開放與坑道／哨所等現況 |
| W016 | Taiwan National Parks `25845` | W16=古寧頭三營區；2014 啟用，位於古寧頭戰史館後方；不再維持「編號與官方名稱未知」的錯誤狀態 |
| 嚨口二營區 | 金門縣政府 `A0A158E23410A02A`、`99523A0EA2FC8DB3` | 縣府正在會勘、整理土地與推動文化景觀／活化；嚨口堡、東一點紅、鎮中堡形成待保存防禦鏈；仍不自行創設座標 |
| 戰地政務 → 國家公園 | 金門縣政府 `4914BF812C839DD3`；財政處公開資料 | 1992-11-07 解除戰地政務；1995-10-18 金門國家公園成立；為後戰地保存與觀光研究的時間骨架 |
| 祭祀／陣亡將士 | 金門縣政府 `9D8905D3A7D05A93`；總統府 65 週年資料 | 萬善祠與國共軍陣亡將士暨先靈祭祀有官方記錄；不把祭祀敘事改寫為戰役單一結論 |
| 聚落／景觀 | Taiwan National Parks `18527`、`18647`；金門觀光旅遊網 navigation | 北山、南山、林厝是古寧頭聚落脈絡；北山斷崖、播音牆、古洋樓、戰史館、李光前將軍廟被列為戰役紀念閱讀節點 |
| 活化／活動 | Taiwan National Parks `31865`、`7989/7772`；金門縣政府相關活化報導 | 國家公園與縣府持續以修復、體驗活動、環境教育與觀光串聯軍事遺址；活動日期／場地需以各官方公告為準 |

## 8. V3 需要關閉的基準缺口

1. 研究資料沒有獨立的全區 site inventory，無法分辨戰役原始地點、戰後據點、紀念設施、自然地景與研究中目標。
2. W016 現在仍被 V2 文案描述為待核對；官方已找到 W16=古寧頭三營區，需更新為有來源的 status，但不建立新 canonical Location。
3. W011/W012/W013 的系列關係已有官方來源，但 W012 的既有 `POI-0023` 只是道路紀錄，不能當完整營區座標；W011 仍缺足夠可公開影像與現況清冊。
4. 嚨口二營區與其防禦鏈是新的官方研究結果，需納入 inventory / research queue，不得直接視為已完成的 production map geometry。
5. Section 01 目前為 1944 航照與戰史館照片的影像比較，尚未提供「歷史航照／現代 canonical map」的誠實並排閱讀模式與未套準提示。
6. 核心據點照片仍不完整；缺照項目應顯示「待授權／待田野拍攝」，不能用相鄰地點代替。

## 9. 變更前保護結論

基準 audit PASS。可以在 `feature/guningtou-then-now-v2` 上進行 V3 的研究 inventory、來源紀錄、展示 adapter 與測試；不得修改 main、不得 push main、不得修改既有 canonical battle geometry。任何涉及新座標、新戰役事件、新部隊、新路線或史料衝突的項目都必須停在 research/human-review 狀態。

