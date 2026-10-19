# V5 全站內容修復與發布驗收

## Scope

本報告記錄 `fix/site-content-quality-v4` 上 V5 的最小差異：三語內容補齊、POI 現代／歷史定位分層、合法媒體接入、公開輸出排除 `.local` 研究資產，以及正式發布前的技術與瀏覽器驗收。沒有修改 canonical battle routes、terrain、戰役幾何或 Historical Evidence Gate 的門檻。

## Acceptance matrix

| Requirement | Status | Evidence | Notes |
|---|---|---|---|
| V4 有效成果保留 | PASS | `npm run test:v4:quality` 11/11；`npm run test:battle-data` 71/71 | 既有地圖、時間軸、今昔頁與 evidence pipeline 保留 |
| 英文時間軸 | PASS | `V5_AUDIT_METRICS.json` | 123/123 筆有 editorial title／description，無 CJK 字元 |
| 簡中顯示層 | PASS WITH REVIEW | `historicalContent.ts`、Playwright 三語 smoke | 主要內容可顯示；少數舊固定文案仍需人工語言 QA |
| 25 處 POI 分層 | PASS WITH REVIEW | `V5_POI_COORDINATE_AUDIT.md`、`data/poi.json` | 5 modern_verified、8 representative、10 historical_review、2 unresolved |
| 湖尾／湖南不合併 | PASS | POI-0010／POI-0015 審查表 | 兩個 canonical POI 維持分開 |
| 人物肖像與授權 | PASS WITH REVIEW | `V5_PERSON_MEDIA_AUDIT.md` | 3/36 人有 4 筆可公開影像；其餘使用中性佔位 |
| 公開影像與研究檔案邊界 | PASS | `V5_MEDIA_AUDIT.md`、`preview:guard` | `.local` 研究引用不進公開集合；缺圖據點不以他處照片代替 |
| Battle data validation | PASS | `npm run validate:battle-data` | errors=0；既有 calibration warnings=4，GCP/精密套準仍未宣稱完成 |
| Battle tests | PASS | `npm run test:battle-data` | 71/71 |
| V2 tests | PASS | `npm run test:v2` | 59/59 |
| Typecheck | PASS | `npm run typecheck` | 0 errors、0 warnings、0 hints |
| Astro static build | PASS | `npm run build` | 286 pages；static output |
| Playwright visual acceptance | PASS | `npm run visual:acceptance:local` | 15/15，1440×900、768×1024、390×844；圖片／溢出／JS／console／HTTP checks 通過 |
| Historical Evidence Gate | BLOCKED | validator output | qualified candidate=none；不以推測資料升格 |
| GitHub Pages | PENDING | 待 feature push、main fast-forward merge 與 workflow | 只有線上 URL 驗收後才標記完成 |

## Historical boundary

V5 可以安全發布現代訪客地點、代表性地名與有授權的現況影像；`historical_review`、`unresolved` 與既有 schematic route 仍是研究／展示狀態。V5 沒有新增未有來源支持的戰役事件、精確時間、部隊、路線或歷史座標。

## Release record

正式發布後，應在本節補登：

- feature commit SHA、main commit SHA
- GitHub Pages workflow run URL 與完成時間
- 正式站首頁、`/zh-tw/`、`/zh-cn/`、`/en/`、地圖、今昔頁與據點頁的外部 HTTP／內容驗收
- 線上版本是否與 main SHA 一致
