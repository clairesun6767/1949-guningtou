# 古寧頭歷史戰役圖文字與圖像轉錄稽核 V0.8

## 來源

- 原始檔案："古寧頭戰役路線圖.jpg"
- 網站副本："public/map-data/historical-battle-map.jpg"
- 來源識別："IMG-HIST-GUN-ROUTE-001"
- 描繪資料："data/battles/guningtou-1949/historical-battle-map-traces.geojson"
- 套準研究："data/battles/guningtou-1949/historical-battle-map-registration.json"

本件是紙本戰役經過示意圖，不是測量圖、現代道路圖或可直接轉成 GPS 軌跡的 GIS 圖層。所有新描繪線條都以 sourceTraceMethod: historical_map_trace 保存，並標示 registrationMethod: schematic_only。

## 可讀文字（仍應以原件人工複核）

| 圖面區域 | 目前可辨識內容 | 狀態 | 使用規則 |
| --- | --- | --- | --- |
| 標題列 | 可辨識為「第二十二軍團保衛金門之戰經過要圖」一類字樣 | PARTIAL / NEEDS HUMAN CONFIRMATION | 不把近似讀法當作正式書名 |
| 上方偏中 | 29A一部、下方可見 85D-254D、259R-... 等軍事標記 | READABLE / PARTIAL | 只保留可辨識的字母數字，不補小字 |
| 右上 | 28A主力，旁有 82D-245D、251R/84D 等標記 | READABLE / PARTIAL | 單位關係需另以史料核對 |
| 下方與中下方 | 18A、14D、118D 等單位標記 | READABLE | 僅作來源圖文字，不自動連到 canonical unit ID |
| 圖面全域 | 紅色粗箭頭、藍色箭頭／路徑、藍色鋸齒狀防線、圓圈陣地／集結符號 | READABLE GRAPHIC SYMBOLS | 以色彩與符號保存，不把它們改寫成精確邊界 |

## 部分可讀與不可讀內容

- PARTIAL：標題副行、箭頭旁的小型軍事縮寫、右側與下方圖例的完整文字。
- UNREADABLE：大部分手寫小字、細小數字、圖例中各符號的完整說明，以及無法由影像清楚辨認的部隊名稱。
- NEEDS HUMAN CONFIRMATION：任何需要將圖面位置對應到現代地名、canonical Location 或正式 unit ID 的判讀。
- 本版沒有把 29A、28A、18A、14D、118D 自動轉成資料庫部隊關聯；relatedUnits 先維持空陣列，避免把圖面字樣誤當成已驗證的單位鏈結。

## 描繪規則

1. 紅色與藍色線條分開保存，保留原圖的分支與曲線。
2. 寬帶、圓圈與鋸齒線分別標記為 corridor、battle area、front/defensive line。
3. 不沿現代 OSM 道路吸附，不重算六處 canonical Location 座標。
4. 無法獨立辨識的分支只進入 researchOnly: true，不進訪客預設播放。
5. 10/27 在來源圖中沒有可獨立確認的日期專屬路線，因此 HMP-06.traceIds 保持空白。

## 待人工工作

- 在 registration editor 中新增至少三個雙向可辨識 anchor，再比較 affine / projective / thin-plate 候選。
- 由人工確認標題、圖例及小型部隊標籤。
- 逐條決定 reviewStatus 是否可由 reviewed 提升為更高的史料狀態；本資料集不會自動提升為 verified GIS route。
