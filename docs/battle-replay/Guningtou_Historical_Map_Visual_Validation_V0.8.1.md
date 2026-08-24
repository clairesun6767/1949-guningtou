# 古寧頭歷史地圖 V0.8.1 — terrain-solid 首輪驗證

本輪只執行 V0.8.1 要求的第一個隔離步驟，沒有修改歷史圖資料、戰役階段、六處 canonical Location 或 registration 狀態。

## 測試模式

網址：

`http://localhost:4321/1949-guningtou/zh-tw/map/?qa=terrain-solid`

`terrain-solid` 會：

- 以單一純白 terrain material 顯示地形；
- 以黑色顯示海面；
- 隱藏 OSM 分類、道路、POI、標籤、舊戰役行動與 V0.8 historical traces；
- 保留 terrain mesh、land alpha mask、regional/local mesh 與 coverage exclusion；
- 顯示 QA triangle / ownership 統計，但不把 ownership count 當成視覺證明。

## 結果

| 項目 | 結果 |
| --- | --- |
| terrain-solid 畫面 | PASS：strategic 與 Guningtou battlefield 視角均呈現連續純白 terrain；未見內部長條黑色缺塊。 |
| 分類 / 道路 / 戰役線視覺隔離 | PASS：fresh DOM 沒有 source-trace legend 或 battle-movement legend；畫面只保留 QA 與基本相機控制。 |
| fresh browser console | PASS：error=0、warning=0。 |
| QA render stats | `402,222 TRI · 5 CALLS · DEM 196×100 / 320×256` |
| ownership reference | `OWN R 2695 · L 59 · NONE 0 · OVERLAP 0`；此數據僅作參考，沒有取代視覺檢查。 |

## 初步判斷

純白 terrain 在本輪隔離視角中是完整的，因此目前證據不支持「regional mesh / local mesh 生成本身必然產生長條缺塊」；下一個優先方向應是 classification material / UV / alpha / LOD transition / texture shimmer，而不是繼續只查 `regionalTrianglesUnderLocalFootprint = 0`。

這不是 V0.8.1 完成宣告。尚未在本輪執行完整的 missing-strip reproduction、top-down coverage capture、regional-only / local-only 對照與 20 秒連續鏡頭 flicker matrix；下一步應在保留此 terrain-solid 基準後，逐一加回 classification、roads、POI、historical traces，找出第一個重新出現缺塊或 flicker 的配置。

## 證據

`screenshots-v0.8.1/01-terrain-solid-guningtou.png`
