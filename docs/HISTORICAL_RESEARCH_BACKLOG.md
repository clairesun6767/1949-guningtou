# 古寧頭 Historical Research Backlog — V1.3

研究缺口不是程式錯誤；它們是目前 repository 材料不足以通過 Evidence Gate 的明確問題。Machine-readable list: `data/battles/guningtou-1949/research-gaps.json`.

V1.3 只完成 repository 內材料的交叉核對與人工審查佇列建立，沒有將任何 gap 標記為 `CLOSED`，也沒有把 legacy record 升格為 canonical historical entity。詳見 [`V1_3_RESEARCH_GAP_REVIEW.md`](V1_3_RESEARCH_GAP_REVIEW.md) 與 [`V1_3_HUMAN_REVIEW_QUEUE.md`](V1_3_HUMAN_REVIEW_QUEUE.md)。

## P0 — blocks the first historical vertical slice

| ID | Entity | Question / required evidence | Status |
| --- | --- | --- | --- |
| `RG-GUN-0001` | `EVT-0008` | 以頁碼／摘錄證明 10/26 指揮權轉移的時間與水頭—湖南高地位置 | OPEN |
| `RG-GUN-0002` | `U-0003` | 為第118師建立直接的單位身份、事件參與與來源綁定 | OPEN |
| `RG-GUN-0005` | `R08` | 以原始戰役圖或作戰記錄核定埔頭至各目標的分段方向、時間與單位 | OPEN |
| `RG-GUN-0007` | `data/sources.json` | 把來源指標補成可審查的書目、頁碼、檔案號或摘錄 | OPEN |
| `RG-GUN-0009` | canonical package | 找到 Event/Time/Location/Unit 均達 `SUPPORTED` 的第一個候選 | BLOCKED |

## P1 — improves battlefield accuracy

| ID | Entity | Question / required evidence | Status |
| --- | --- | --- | --- |
| `RG-GUN-0004` | `LOC-GUN-0005` | 確認南山的歷史身份、範圍與 `POI-0008` mapping | OPEN |
| `RG-GUN-0006` | `R11` | 分離 PLA 退守與 ROC 包圍，建立有時間界線的來源鏈 | OPEN |
| `RG-GUN-0008` | `REG-GUN-NORTH-COAST` | 找到北端海岸戰區的來源定義與邊界證據 | OPEN |

## P2 — future enrichment

| ID | Entity | Question / required evidence | Status |
| --- | --- | --- | --- |
| `RG-GUN-0003` | `LOC-GUN-0003` | 確認安岐是否為 1949 歷史事件節點，而非僅現代地理參考 | OPEN |

## Working rules

- 先取得原始戰報、官方戰史、可核對的檔案或具頁碼的可靠二手研究，再建立 claim。
- 不以 Web 搜尋結果、AI 推論、道路形狀或座標鄰近補齊缺口。
- 研究完成後先更新 `historical-claims.json`、evidence matrix 與 audit，再由 validator/Gate 決定是否可接入正式 Engine。
- 任何 route promotion 都要保留 source provenance、legacy IDs、confidence 與 uncertainty；不刪除 R01–R12 的原始稽核記錄。

## V1.3 review result

- P0 gaps reviewed: 5; closed: 0.
- P1 gaps reviewed: 3; closed: 0.
- P2 gaps reviewed: 1; closed: 0.
- Remaining decision: human review must supply or reject the missing page-level, unit-level, location, and route evidence before the Gate can be re-evaluated.
