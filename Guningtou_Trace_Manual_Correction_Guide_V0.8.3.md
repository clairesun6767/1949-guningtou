# 古寧頭戰役 Trace 人工修正指南 V0.8.3

本指南把歷史圖上的路線修正交給人工 review。現有資料仍為 `schematic_only` / `approximate`，不是 GCP 精密套準，也不會自動 snap 到 OSM 道路。

## 修正優先順序

1. 國軍反擊方向：`HBT-ROC-ARROW-01`、`HBT-ROC-ARROW-02`。
2. 國軍防線與戰線：`HBT-ROC-ARROW-03`、`HBT-ROC-FRONT-01`、`HBT-ROC-FRONT-02`。
3. 共軍登陸後向內陸推進：`HBT-PLA-ARROW-01`、`HBT-PLA-ARROW-02`、`HBT-PLA-CORRIDOR-01`。

先完成 10/26 的藍線，再回頭檢查 10/25 的登陸與內陸推進。研究用 `researchOnly` 分支不應被誤標成 production trace。

## 進入工作台

啟動 Astro development server 後開啟：

`http://localhost:4321/1949-guningtou/dev/historical-battle-map-registration/`

這是 development-only 工作台。正式 map 會讀取 source-controlled 的：

`data/battles/guningtou-1949/historical-battle-map-traces.geojson`

## 人工修正流程

1. 開啟 **source map**，確認古寧頭戰役原圖與目前選取的 `sourceGraphic`。
2. 在 trace filter 選擇 PLA、ROC、防線或戰鬥區域，再選取既有 trace。
3. 對照 source map、visitor map 與 canonical location 參考；visitor map 只代表目前的 schematic geometry。
4. 拖曳選取 trace 的 vertex 修正路徑；需要時按「新增 vertex」或「刪除 selected vertex」。
5. 必要時以 source control point 編輯原圖上的描繪控制點。這不會自動產生地理轉換。
6. 按「下載正式 trace dataset」保存完整 FeatureCollection，確認不是只保存單一 trace。
7. 由研究者審查下載檔，再替換上述 `historical-battle-map-traces.geojson`，執行 battle-data validation、tests、typecheck、build。
8. 開啟正式 map，切換 10/25 與 10/26，確認 active geometry、標籤、方向與原圖語意一致。

## 驗收條件

- 10/25 能一眼讀出共軍登陸、向內陸推進與主要行動區域。
- 10/26 能一眼讀出國軍反擊、國軍防線與戰線變化。
- `sourceGraphic` 與 visitor geometry 的人工判斷仍可追溯到同一條 source trace。
- route geometry 沒有被自動吸附到道路，也沒有被當成 verified route。
- `reviewStatus`、`visibility`、`researchOnly` 與 `registrationMethod` 經 validation 通過。

## 不得任意改動的欄位

除非有新的可追溯史料並經研究者審查，不得任意修改：

- `sourceIds`、`sourceMapId`、`sourceImage`、`sourceTraceMethod`、`provenance`。
- `confidence`、`registrationMethod`、`reviewStatus`、`visibility`、`researchOnly`。
- `relatedLocations` 與 canonical Location 座標。
- `visitorLabel`、`sourceLabel`（舊資料的 `label` 是 source label 的相容欄位）。

本輪人工工作只修正 trace 的 geometry / source control points 與明確的 review 狀態；不重算座標、不改 canonical Locations、不啟用自動 transform。
