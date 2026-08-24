# 古寧頭歷史戰役圖 V0.8 視覺與執行驗證

## 驗證範圍

本輪依照 V0.8 指令，以 `古寧頭戰役路線圖.jpg` 作為來源圖，保留其軍事示意圖性質；沒有把來源圖自動當成精密 GIS，也沒有修改六處 canonical Location 座標。歷史圖描繪資料另存於 `historical-battle-map-traces.geojson`，既有 `routes.geojson` 與 V0.6/V0.7 movement 資料維持分離。

來源圖正式靜態資產：

`public/map-data/historical-battle-map.jpg`

註錄與人工套準工作台：

`/1949-guningtou/dev/historical-battle-map-registration/`

## 執行檢查結果

| 檢查 | 結果 |
| --- | --- |
| `npm.cmd run validate:battle-data --silent` | 通過；errors=0。現有 imagery calibration 仍有 4 個既有 warning，未被誤報為 ERROR。 |
| `node --test tests/battle-replay/*.test.mjs` | 50 passed / 0 failed |
| `npm.cmd run typecheck --silent` | 0 errors / 0 warnings / 0 hints |
| `npm.cmd run build --silent` | 通過；276 pages built。僅有既有 chunk size warning。 |
| fresh browser tab, `/1949-guningtou/zh-tw/map/` | 載入成功；error/warning=0 |

## 來源圖與播放驗證

- 預設顯示 11 筆已審閱的歷史圖描繪；研究用未確認分支只有在史料模式開啟後才可見。
- 來源圖覆蓋預設關閉；開啟後顯示 `Schematic historical map · registration approximate` 與不透明度控制。
- 覆蓋與描繪均標示：`依歷史戰役圖描繪，位置為示意性套準，非精密測量路徑。`
- 播放控制包含播放/暫停、上一階段/下一階段、0.5×/1×/2×、連續進度滑桿與跟隨戰況（預設關閉）。
- 1949-10-27 / HMP-06 目前顯示 0 筆可公開播放的歷史圖幾何，並保留「目前史料不足以建立可信的 10/27 行動幾何」說明。
- 390×844 檢查：水平溢位為 false；地圖、時間軸與控制列均可載入。

## Terrain QA

`?qa=terrain-ownership` 實測數據：

`OWN R 2695 · L 59 · NONE 0 · OVERLAP 0`

因此本輪沒有出現 magenta no-owner 或 red overlap 樣本。`?qa=no-lod` 可正常載入並切換為 no-lod QA；`?qa=texture-linear` 與 `?qa=texture-mipmap` 均可載入，debug panel 分別顯示 `TEXTURE linear · ANISO 1` 與 `TEXTURE mipmap · ANISO 8`，且 fresh tab error/warning=0。

## 截圖

- `screenshots-v0.8/01-strategic-scale.png`
- `screenshots-v0.8/02-guningtou-overview.png`
- `screenshots-v0.8/03-research-mode.png`
- `screenshots-v0.8/04-source-map-overlay.png`
- `screenshots-v0.8/05-phase-playback.png`
- `screenshots-v0.8/06-1949-10-27-empty-traces.png`
- `screenshots-v0.8/07-mobile-map.png`
- `screenshots-v0.8/08-mobile-battle.png`
- `screenshots-v0.8/09-terrain-ownership-qa.png`

## 尚未宣稱完成的研究工作

來源圖仍維持 `schematic_only` / `schematic_pending`，候選 control points 尚未被宣稱為正式地理套準；研究線與圖中文字也沒有被自動升級為 verified unit 或精確路徑。後續若要提高 registrationMethod，必須由人工研究者在工作台逐點確認並補上可追溯來源與殘差審核。
