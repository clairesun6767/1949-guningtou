# 古寧頭歷史戰役圖來源與描繪稽核 V0.8

## 結論摘要

V0.8 已將上傳的 "古寧頭戰役路線圖.jpg" 正式納入一個與 routes.geojson、battle-movements.geojson 分離的來源圖描繪資料集。它可以提供訪客檢視的歷史符號、相對行動方向與戰鬥範圍，但目前沒有已啟用的雙向控制點，也沒有選定的像素至 WGS84 轉換。網站因此使用「schematic historical map registration」，不使用「exact georeference」或「survey route」語意。

## 資產與註錄

| 項目 | 結果 |
| --- | --- |
| 原始來源 | D:/Hermes/Projects/1949/古寧頭戰役路線圖.jpg |
| Web 副本 | public/map-data/historical-battle-map.jpg |
| sourceMapId | IMG-HIST-GUN-ROUTE-001 |
| 描繪資料 | historical-battle-map-traces.geojson |
| 登錄研究 | historical-battle-map-registration.json |
| 階段資料 | historical-battle-phases.json |
| 啟用 anchors | 0 |
| 選定 transform | none |
| residual | N/A；尚未有足夠人工控制點 |
| registrationMethod | schematic_only |
| sourceTraceMethod | historical_map_trace |

## 來源描繪統計

| 類別 | 訪客可見 | 研究專用 | 合計 |
| --- | ---: | ---: | ---: |
| PLA movement / attack arrows | 4 | 0 | 4 |
| ROC movement / attack paths | 3 | 0 | 3 |
| fronts / defensive lines | 2 | 0 | 2 |
| battle areas | 2 | 0 | 2 |
| unresolved research traces | 0 | 2 | 2 |
| source-traced features | 11 | 2 | 13 |

以上是「來源圖描繪」統計，不是已驗證 GPS 路徑統計。routes.geojson 仍為 0；舊 V0.6/V0.7 行動解讀仍保留於 battle-movements.geojson，訪客模式不與本來源圖幾何重複疊畫。

## 套準與不確定性

- 圖面為軍事示意圖，紙張、比例、方向與現代地理不保證一致。
- 尚未有可同時在來源圖與可靠地理中辨識的 anchor；候選 anchor 皆停用並標為 needs_human_confirmation。
- 不以最低數值殘差自動選 transform；人工確認足夠控制點後才可比較候選。
- 新幾何使用近似 WGS84 顯示位置，只為畫面比較與播放；不是對原圖做精密重算。
- 藍／紅色是來源圖符號語意的保留，不代替單位史料驗證。

## 階段與日期

HMP-01 至 HMP-05 只使用日級或相對階段語意。HMP-06（1949-10-27）沒有 source trace，因為本圖是戰役總覽，無法獨立支持 10/27 專屬路線。播放到 10/27 時應呈現誠實空白，而不是自動延伸前一階段。

## V0.7 差距稽核銜接

| V0.7 Gap | V0.8 歷史圖支持 | Trace candidate | 建議 |
| --- | --- | --- | --- |
| G01 登陸至內陸 | PARTIAL | YES | 保留 HBT-PLA-ARROW-01 與 corridor；不稱為精確路線 |
| G02 西側／北側行動 | PARTIAL | YES | 藍色分支分開描繪，待地名與單位人工核對 |
| G03 反擊關係 | PARTIAL | YES | 只展示相對箭頭與 front |
| G04 北端收縮 | PARTIAL | YES | HBT-PLA-ARROW-03；日期採 relative phase |
| G05 10/27 專屬路徑 | NO | NO | 維持 HMP-06 空白 |
| G06 單位級路線 | PARTIAL | NO | 圖中文字可讀但沒有足夠 unit linkage，不寫入 relatedUnits |
| G07 道路／GIS 精度 | NO | NO | 不沿 OSM 道路吸附、不升格 routes.geojson |

## 驗收指標（V0.8）

- source-traced PLA：4
- source-traced ROC：3
- front / defense：2
- battle areas：2
- superseded old generic geometry：0（舊資料保留為 research history，不刪除）
- verified GIS routes：0
- research-only source traces：2
- unresolved annotations：標題／圖例／小字與 anchor 身分，詳見 transcription audit

## 發布限制

在人工確認 anchor、逐條檢視原圖與完成連續影格／地形 ownership QA 前，本版不宣稱「精密套準完成」。訪客介面必須顯示：

> 依歷史戰役圖描繪，位置為示意性套準，非精密測量路徑。
