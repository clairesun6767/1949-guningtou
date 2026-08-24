# 古寧頭戰役 3D Historical Map — V0.7 Visual Validation

日期：2026-08-24  
本地網址：`http://localhost:4321/1949-guningtou/zh-tw/map/`

## 結論

V0.7 的區域地形 ownership、戰場行動可讀性、日期切換、桌面縮放、行動版 viewport 與連續地形穩定性已完成驗證。正式資料沒有新增未被史料支持的 route，也沒有改寫 canonical Location 座標。

中鍵拖曳的程式契約已通過，但本輪瀏覽器控制介面只提供左鍵 `drag` 路徑；其 `click` 不接受中鍵拖曳持續狀態。因此「中鍵平移 before/after」的真人手勢截圖仍標記為待手動補拍，沒有把工具限制誤報成通過。

## 資料與建置 gate

| Gate | 結果 |
| --- | --- |
| `npm.cmd run validate:battle-data` | PASS；quality errors=0、warnings=0、info=0；calibration errors=0、warnings=4；6 個 Guningtou Location 均有 geometry |
| `npm.cmd run typecheck` | PASS；0 errors、0 warnings、0 hints |
| `npm.cmd run test:battle-data` | PASS；47/47 |
| `npm.cmd run build` | PASS；275 pages；只有既有 Vite large-chunk warning |

Calibration 的 4 個 warning 是兩張 1944 航照各缺少 GCP、且 georeference 仍 pending；這些航照沒有被當成對齊地形使用。

## V0.7 瀏覽器驗證

### Terrain ownership / seam

- Local terrain bounds：`118.285..118.370E × 24.440..24.500N`。
- Regional terrain build exclusion：`1,176` triangles。
- QA debug：`UNDER LOCAL 0`。
- `terrain-seam` 截圖中，regional wireframe 在 local footprint 外圍，local wireframe 填入 footprint；未觀察到 regional mesh 穿入 local ownership。
- `terrain-only`、`classification-only`、`regional-only`、`local-only` 四個 QA query 均能建立 Three canvas 並正確回報 `data-qa-mode`。

### Controls / stability

- Canvas contract：`left-rotate middle-pan wheel-zoom`。
- `touch-action: none`；地圖外的 viewport 維持頁面捲動規則。
- Actual wheel zoom：strategic `64.000 → 44.694`；另一輪 local QA `11.754 → 8.209`，頁面 `scrollY` 保持 `0`。
- Strategic、Kinmen、Guningtou 各執行 20 秒、每 2 秒交替 wheel zoom，共 10 次取樣；每次 screenshot 都有有效畫面，console 沒有 error/warning，未觀察到地形消失或 flicker。
- 390×844 真實 viewport：10/25、10/26 均進入 `guningtou`；canvas 寬 `375.2px`、高度 `570px`，無水平 overflow。

### Movement readability

- Production：2 `ATTACK_AXIS`、2 `MOVEMENT_CORRIDOR`、0 verified route。
- Axis 使用 taper、arrowhead 與 halo；corridor 使用寬半透明 band、border 與 direction indicator。
- 10/25、10/26 顯示 approved movement；10/27 顯示「目前史料不足以建立可信的 10/27 行動幾何」，不繪製虛構路線。
- route legend 在 route count=0 時不顯示；corridor legend 明確寫「大致行動範圍，非精確行軍路線」。
- research-only movement：1 筆，Visitor Mode 隱藏。

## Screenshot index

截圖位於 `docs/battle-replay/screenshots-v0.7/`：

| 檔案 | 用途 |
| --- | --- |
| `01-strategic-desktop.png` | Strategic desktop |
| `02-guningtou-overview.png` | Guningtou overview |
| `03-10-25.png` | 1949-10-25 |
| `04-10-26.png` | 1949-10-26 |
| `05-10-27.png` | 1949-10-27 empty-geometry state |
| `06-terrain-seam-qa.png` / `06-terrain-seam-qa-local.png` | terrain seam QA、regional/local wireframe |
| `07-zoom-in-qa.png` / `08-zoom-out-qa.png` | wheel zoom QA |
| `09-flicker-strategic-*` | Strategic 20-second stability sample |
| `10-flicker-kinmen-*` | Kinmen 20-second stability sample |
| `11-flicker-guningtou-*` | Guningtou 20-second stability sample |
| `12-mobile-10-25.png` | 390×844 mobile 10/25 |
| `13-mobile-10-26.png` | 390×844 mobile 10/26 |

`middle-pan-before/after` 尚未列入檔案：目前工具的 drag API 固定發送 left button，無法產生持續 middle-button drag；程式映射與 47 項測試已通過，需以實體滑鼠補做該兩張真人手勢截圖。

## Final metrics

| Metric | Value |
| --- | ---: |
| canonical Locations | 6 |
| Location geometry null | 0 |
| production movement features | 4 |
| production corridors | 2 |
| production attack axes | 2 |
| verified routes | 0 |
| research-only movement | 1 |
| unsupported route geometry created | 0 |
| canonical coordinate replacements | 0 |
| regional triangles excluded below local footprint | 1,176 |
| regional triangles under local footprint after exclusion | 0 |

缺口與後續待審項目另見 [Guningtou_Battle_Movement_Gap_Audit_V0.7.md](Guningtou_Battle_Movement_Gap_Audit_V0.7.md)；R01–R12 audit 未被修改。
