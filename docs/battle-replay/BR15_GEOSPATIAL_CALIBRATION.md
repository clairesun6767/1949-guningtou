# BR-1.5 古寧頭地理校準與戰場座標編輯器

狀態：Engineering complete；historical calibration pending  
適用資料包：`guningtou-1949`  
Canonical horizontal CRS：`EPSG:4326`（WGS84，GeoJSON 順序固定為 `[longitude, latitude, altitude?]`）

本階段只建立人工校準工具、資料模型、驗證與政策。它不代表六個核心位置已完成史實校準，也不授權進入 BR-2、建立 ENU runtime、BattleClock、路徑動畫或部隊移動。

## 1. Why calibration gate exists

Battle replay 會把座標當成可計算的事實。若未經確認的現代地名、搜尋結果或概略位置被當成歷史點位，後續距離、路徑、視角、地形與時間動畫都會產生看似精確但不可追溯的結論。因此 BR-2 前設置 calibration gate：技術上有效的座標仍須與史料來源、辨識方法、審查者、時間及不確定性一起保存。

目前六處位置維持 `pending-manual-verification`，canonical routes 維持 0；工具及測試不得替它們生成答案。

## 2. Coordinate Editor workflow

開發環境頁面：`/1949-guningtou/dev/battlefield-coordinate-editor/`

1. 由 canonical `guningtou-1949` package 載入六處 Location、Routes、Sources、GCP 與影像 metadata。
2. 選擇位置，閱讀 historical name、modern name、aliases、現有 geometry、狀態與 provenance。
3. 以分欄輸入 longitude / latitude，或貼上兩種常見座標順序。
4. 編輯器只提出 candidate，使用者必須填入方法、審查者、來源、confidence 與 notes，並明確確認。
5. Save 前執行 package validation。`ERROR` 阻止儲存；`WARNING` 與 `INFO` 顯示但不阻止。
6. 草稿儲存在 package-scoped browser `localStorage`，可 reset、切換下一處、reload 後續編。
7. 匯出 GeoJSON 後由人工 review，再取代 repository canonical file 並執行資料驗證。靜態網站本身不直接寫入工作樹。

Production build 只顯示「development-only」說明，不載入 editor island。

## 3. Google Maps / Earth reference workflow

Editor 透過 `MapReferenceAdapter` 提供 reference abstraction。目前重用 Leaflet + OpenStreetMap 作為現代參考底圖；它不是歷史證據。

Google Maps 與 Google Earth 只以外部 manual reference 使用：

1. 使用者從 Editor 開啟外部服務或政府 GIS。
2. 由人辨識歷史位置與現代地物的關係。
3. 複製座標回 Editor。
4. 明確選擇 `google-map-manual-reference`、`google-earth-manual-reference`、`government-map` 等方法。
5. 加入可追溯 source reference / description 與判讀 notes。

系統不下載 Google tiles、不 scrape、不呼叫 endpoint 自動搜尋，也不把 OSM 或 Google 的候選結果靜默寫入 canonical data。

## 4. Canonical WGS84 rule

- Canonical CRS 固定為 `EPSG:4326`。
- GeoJSON position 固定儲存 `[longitude, latitude]`；若未來有高度則為 `[longitude, latitude, altitude]`。
- `24.x, 118.x` 會辨識為 latitude-first，正規化成 `[118.x, 24.x]`。
- `118.x, 24.x` 會辨識為 longitude-first。
- 當兩個數值在兩種順序都合法時，結果標為 ambiguous，必須由使用者明確分欄或以 `lat=` / `lng=` 標示；不得 silent swap。
- longitude 必須在 `[-180, 180]`，latitude 必須在 `[-90, 90]`。
- 目前六處位置不加入虛構 altitude。

## 5. Manual override workflow

所有 Location 座標變更都必須經 `applyManualCoordinateOverride()`，不能由 UI 直接改 canonical properties。服務保留：

- previous/original candidate；
- final coordinate；
- verification method；
- reviewer；
- ISO timestamp（由使用者確認儲存動作時產生審查紀錄）；
- verification status；
- confidence；
- source refs；
- notes。

保存後狀態為 `manually-verified`，但若沒有歷史來源仍產生 `MANUAL_VERIFICATION_ONLY` warning。人工確認不等同 source-verified。

## 6. Route waypoint workflow

Route editor 可建立 draft、選擇 optional unit、設定 route type / nature、來源、confidence、notes，並新增、移動、刪除、重排 waypoint。Waypoint ID 一旦建立就保持穩定；sequence 依畫面順序正規化。

只有人實際輸入的 waypoint 才能形成 geometry：

- 0–1 waypoint：`geometry = null`；
- 2 個以上：依 waypoint 順序建立 `LineString`；
- 不提供 start + end 自動尋路；
- geometry coordinates 必須逐點等於 routePoints；
- uncertainty segment 只能指向相鄰且存在的 waypoint；
- `reconstructed` 或 `estimated` route 不得標為 `confirmed`。

支援的 route nature 為 `recorded`、`reconstructed`、`estimated`、`possible`、`unknown`。這是史料性質，不是地圖廠商算出的路線品質。

## 7. GeoJSON round-trip

Editor 的順序是 load → edit → validate → local save / export → reload。序列化只包裝標準 `FeatureCollection`，不重建 feature，因此應保留 provenance、source refs、IDs、coordinate precision 及未編輯 feature 的順序。

Repository save 是刻意分成兩步：

1. Editor 下載 locations/routes GeoJSON 或 GCP/imagery JSON；
2. 人工 review 後更新 canonical package，再執行 `npm run validate:battle-data`。

這個界線避免開發頁在無 server API 的 static Astro 架構中任意覆寫史料檔。

## 8. GCP workflow

`ground-control-points.json` 提供空白 GCP dataset；BR-1.5 不預填任何控制點。每個 GCP 至少記錄：

- stable `id` 與 `imageId`；
- `imagePixel: [x, y]`；
- WGS84 `coordinate: [longitude, latitude, altitude?]`；
- `sourceRef` 或 `sourceDescription`；
- confidence；
- verification status；
- notes。

Editor 讓使用者選影像、填 pixel 與經緯度後加入 candidate。驗證會拒絕負值、超出影像尺寸、錯誤 image/source reference、重複 ID 與非法 WGS84 座標。

Error model 支援 GCP count、per-GCP residual（pixel / meter）、RMSE（pixel / meter）、transform type、confidence 與 verification status。Affine / unknown 最少需 3 GCP，homography 最少 4 GCP；不足或缺少有限 RMSE 時不得標為 verified。

## 9. 1944 aerial preparation

Repository 內兩張影像已有 metadata skeleton：

| imageId | path | dimensions | capture | CRS / transform |
|---|---|---:|---|---|
| `IMG-GUN-1944-001` | `/aerial-1944.png` | 2548 × 1127 | 1944 | unknown / pending |
| `IMG-GUN-1944-002` | `/aerial-1944a.png` | 2935 × 1157 | 1944 | unknown / pending |

目前 bounds、GCP refs、transform、residuals 與 RMSE 均未推測。影像可作人工歷史判讀素材，但在 georeference verified 前不可當作已對齊的 terrain 或 canonical basemap。來源 lineage 與權利狀態仍需人工確認。

## 10. Local ENU origin policy

本階段只決定選擇政策，不 hard-code origin，也不實作 WGS84 → ENU。

| Strategy | Precision | Stability | Future expansion / routes | Terrain compatibility |
|---|---|---|---|---|
| A. calibrated battlefield extent centroid | 對當前範圍平均最佳 | 範圍一變即漂移 | 大幅擴張會改 origin，不利長期 replay | 適合一次性資料集，不利版本穩定 |
| B. fixed verified anchor near center | 局部精度佳 | anchor 核准後穩定 | 新路徑擴張仍可維持，只需監控距離 | 容易與固定 terrain frame 對齊 |
| C. designated canonical origin | 取決於指定位置 | 政策上最穩定 | 最利跨版本、跨模組，但任意選點可能偏離中心 | 適合正式 runtime contract |

Recommendation：先完成六處 Location、主要 route extent 與 production terrain coverage 的校準；以 A 計算範圍中心作比較，不把它存成 origin；選擇最靠近中心且已 source-verified 的固定 anchor（B），經審核後將它登記為 designated canonical origin（C）。這兼顧數值精度與跨版本穩定性。六處位置未確認前不得選定。

## 11. Altitude policy

- Horizontal canonical coordinates 維持 WGS84。
- Altitude 是 optional，存在時必須另有明確 `altitudeReference`。
- `ellipsoidal`：保存 GNSS 原始高程時使用，必須記錄量測來源。
- `orthometric`：production terrain / human-readable elevation 的首選，但必須記錄 vertical datum 與 geoid model；不可只寫「海拔」。
- `terrain-relative`：只可作 runtime / visualization derived value，不作 canonical historical truth。
- `unknown`：無可靠 datum 時省略 altitude；若欄位因交換格式必須存在，明標 unknown，禁止以 0 代表海平面。

Recommendation：canonical source measurement 可保留 ellipsoidal；經有文件的垂直基準轉換後，以 orthometric 作 terrain integration。現在六個 Location 不填高度。

## 12. Terrain layer policy

| Layer class | BR-1.5 / BR-2 policy |
|---|---|
| Development reference | Leaflet + OSM 僅供現代定位與 UI 測試，不是歷史證據 |
| Production terrain | 未選定；未來優先採具 datum、解析度、授權與版本資訊的權威 DEM，不在本階段導入 engine |
| Historical imagery | 1944 航照，只有在 GCP、transform、RMSE 與權利狀態審核後才可作 aligned overlay |
| Modern imagery | 僅作人工參考，必須與 historical layer 分開，不得替代史料 |
| Government GIS | 可作高可信 reference，但需保存資料集名稱、版本/日期、CRS、精度與授權 |
| Aerial imagery | 依 capture date、lineage、georeference quality 與 rights 管理，不因檔名或視覺吻合即視為 verified |

所有 layer 都必須明確區分「開發參考」、「現代參考」、「歷史證據」與「production terrain」。BR-1.5 不導入 Cesium 或其他 terrain engine。

## 13. BR-2 readiness gate

BR-1.5 engineering 完成後，BR-2 仍是 conditional / blocked by data。進入 BR-2 前至少需要：

- 六處核心 Location 經人工作業完成，且審查 provenance / source warnings；
- canonical routes 不再是 0，且每一條路徑有人工 waypoint、來源與 uncertainty；
- 至少一張 1944 航照完成足量 GCP、transform fit、residual 與 RMSE review；
- Local ENU origin 依上述 B → C 流程正式核准；
- altitude reference 與 production terrain vertical datum 鎖定；
- terrain / imagery rights、dates、CRS、accuracy 可稽核；
- `typecheck`、battle data tests、canonical validation 與 production build 全部通過。

在這些條件完成前：BR-1.5 工具可使用，BR-1 保持 GO，BR-2 為 CONDITIONAL GO，Route / Troop Animation 維持 NO-GO。

## Human calibration sequence

Historical location → Coordinate Editor → external Google Maps / Google Earth or available GIS reference → human identification → copy coordinate → normalized editor input → provenance metadata → manual verification → GeoJSON export → validation → reviewed canonical Battle Package。

