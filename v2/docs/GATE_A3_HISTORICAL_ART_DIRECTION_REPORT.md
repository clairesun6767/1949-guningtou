# Gate A.3 Historical Aerial Art Direction

## Baseline

Gate A.3 is built on the A.2 regional composition branch at `f49c137970ba530f6eefcaad52dd90ba8b7c022a`：A.2 B-quality strategic bounds、1.5× runtime vertical exaggeration、平滑 normals／relief lighting、AO、OSM coastline reference，以及以金廈中心向外淡出的 infinite atmospheric ocean shell 均保留。

本關卡不把現代 DEM 說成 1949 高程。DEM、OSM 海岸線與分類遮罩均標示為 `MODERN REFERENCE`；1945 航照只作 `HISTORICAL IMAGERY REFERENCE` 的候選來源。

## Historical Source Audit

完整審計見 [GATE_A3_HISTORICAL_AERIAL_SOURCE_AUDIT.md](./GATE_A3_HISTORICAL_AERIAL_SOURCE_AUDIT.md)。官方 WMTS 可辨識出 `金門舊航照影像(1945)`／`Kinmen_1945`、WGS84 bounds `118.2727648–118.4966956E / 24.3437997–24.5362935N`、EPSG:3857 `GoogleMapsCompatible` tile matrix 與 PNG 格式；但官方頁面保留版權聲明，高解析複製需申請，沒有支持 GitHub、衍生材質或公開 runtime 的明確授權。

因此本關卡判定：**BLOCKED — RIGHTS UNCLEAR**。

- 沒有下載、快取、拼接或提交任何 1945 航照像素。
- 沒有以現代衛星圖、任意灰階圖或 AI 生成圖冒充 1945 航照。
- `HistoricalAerialLayer`／`HistoricalAerialProvider` 保留 year-aware 介面；provider 固定回傳 `rights-blocked`，`payloadBytes=0`，不發出 tile request。

## Aerial Integration

`v2/prototypes/region/HistoricalAerialLayer.ts` 是來源安全的狀態 adapter，metadata 來自 `v2/config/historicalAerial.ts`。`RegionScene` 與 B/C terrain handle 已接上：

- 模式：`OFF`、`AERIAL`、`AERIAL_RELIEF`。
- debug opacity：0–100%，含 0／25／50／75／100 快捷值與 slider；因來源被阻擋，opacity 不會讓不存在的像素出現。
- `AERIAL_RELIEF` 只切換保留地形陰影的審查狀態，不宣稱已完成航照對齊。
- coverage mask debug 目前只顯示狀態與官方 bounds；沒有把未授權影像畫成矩形，也沒有硬切 coverage edge。
- alignment：`SOURCE REVIEW`；尚未計算 RMSE，未做人工地理配準。
- shader 已保留 base terrain／aerial slot／relief／archival tone 的接點，但 `sourcePixelsAvailable=0.0`，不綁定假 texture。

若日後取得書面授權，整合順序固定為：官方 bounds／CRS → 小範圍地理對齊 → 記錄 RMSE → crop／reproject → WebP／JPEG／KTX2 derivative → Three UV／DEM displacement。1945 航照仍不會被用作 heightmap。

## Historical Terrain Palette

A.3 default 以現代 DEM 為幾何來源，採較明亮、低綠色主導的檔案色調：desaturated sage、warm gray、paper beige、charcoal，並以高度梯度保留地形層次。分類遮罩仍可開關，但不再以強綠色作主要視覺訊號。

## Brightness / Lighting

預設模式是 `歷史日光 / HISTORICAL DAYLIGHT`：提高 ambient fill 與 tone-mapping exposure，保留 sun shadow、relief response、smooth normals 與 AO。另有：

- `戰地晨曦 / BATTLEFIELD DAWN`：低角度暖光與長陰影。
- `航照檔案 / AERIAL ARCHIVE`：檔案色調、地形起伏與來源審查狀態。

## Traditional Chinese UI

主要介面改為繁體中文：區域、金廈地理關係、戰略地形、進入古寧頭戰場、進入探索、選擇模式、資料界線、現代地形參考、地形高程、海岸線、歷史航照與戰役資料均以中文優先；English 僅作 secondary technical label。一般瀏覽不再顯示光影模式選單，預設為歷史日光；光影控制僅保留在開發除錯面板。

主標題改為「金門 — 廈門」，次標 `KINMEN — XIAMEN`；文案為：

> 一水之隔，兩岸對峙。  
> 從金廈海域，重新理解古寧頭戰場的地理尺度。

## Typography

中文 fallback 使用 `Noto Sans TC`、`PingFang TC`、`Microsoft JhengHei`、sans-serif；主標縮小約 30%，手機再以單行可容納的尺寸重排。技術數據與 metadata 使用 monospace，避免整個 UI 看起來像純工程面板。

## Historical Mode

歷史模式在 debug panel 可審查：

| 模式 | 中文顯示 | 實際狀態 |
| --- | --- | --- |
| OFF | 歷史地形 | A.3 檔案色調＋現代 DEM；航照 channel 關閉 |
| AERIAL | 1945 航照 | `SOURCE REVIEW`；無航照像素 |
| AERIAL_RELIEF | 航照 × 地形 | `SOURCE REVIEW`；保留 relief lighting；無航照像素 |

畫面底部以「資料界線／DATA BOUNDARY」文字標示歷史航照為 local-only POC、像素不進 GitHub、權利狀態未確認；不再以阻擋瀏覽的來源審查對話框佔據地圖。

## Ocean / Background

沿用 A.2 的 camera-centered `SphereGeometry` atmospheric sea shell，不新增有限平面。海面改為較不黑的 desaturated blue-gray／charcoal teal，保留微弱 haze、glint 與低振幅低頻流動；背景改用 deep gray-blue／warm gray-black，避免純黑 void 與明顯陸地截斷。

## Performance

預設仍為 composition B `640×368`，未新增高密度幾何或整站 tile server。A.3 historical layer 在 rights-blocked 狀態的 aerial payload 與 GPU texture allocation 為 0；新增的 metadata／狀態成本為小型純 TypeScript adapter。debug stats 會列出 FPS、draw calls、triangles、textures、GPU estimate、aerial resolution、payload、source year、bounds、alignment。

## Browser Screenshots

以下均由實際 Chrome／Three.js 輸出，沒有影像修圖或地理後製：

- [A3_WIDE_HISTORICAL_DAYLIGHT.png](../../docs/2.0/screenshots/gate-a3/A3_WIDE_HISTORICAL_DAYLIGHT.png) — 1920×1080，歷史日光。
- [A3_KINMEN_BASE.png](../../docs/2.0/screenshots/gate-a3/A3_KINMEN_BASE.png) — 1920×1080，金門視角。
- [A3_GUNINGTOU_BASE.png](../../docs/2.0/screenshots/gate-a3/A3_GUNINGTOU_BASE.png) — 1920×1080，古寧頭視角。
- [A3_MOBILE.png](../../docs/2.0/screenshots/gate-a3/A3_MOBILE.png) — 390×844，手機重排。
- [A3_AERIAL_BLOCKED.png](../../docs/2.0/screenshots/gate-a3/A3_AERIAL_BLOCKED.png) — 1920×1080，來源審查面板與 truthful placeholder。

因航照權利被阻擋，沒有生成 `A3_WIDE_AERIAL_ARCHIVE.png`、`A3_KINMEN_AERIAL.png`、`A3_GUNINGTOU_AERIAL.png` 或 `A3_GUNINGTOU_AERIAL_RELIEF.png`，避免把不存在的像素誤當成已完成歷史航照。

## A.2 vs A.3

[GATE_A3_COMPARISON.png](../../docs/2.0/screenshots/gate-a3/GATE_A3_COMPARISON.png) 使用同一組 B 1.5× strategic camera family：左為 A.2 現況，中央為 A.3 歷史地形色調，右為 A.3 1945 source-review 佔位。中央與右側不會假裝有兩套不同航照資料；差異在右側的來源審查狀態。

## Historical Accuracy Boundary

本關卡只宣稱「現代 DEM 的歷史藝術方向 prototype」與「1945 來源 adapter／rights gate」。它不宣稱 DEM 是 1949 地形、不宣稱航照已取得授權、不宣稱已完成配準、不宣稱戰役資料已載入，也不把 UI 的歷史色調當成史料本身。

## Known Limitations

- `Kinmen_1945` 原始像素尚未取得可提交 GitHub／公開 runtime 的書面授權，因此沒有真實 aerial × relief 輸出。
- 尚無 aerial-to-DEM RMSE、tie points 或 alignment report。
- 官方 WMTS metadata 的 preview `maxzoom=19` 與 capabilities matrix 0–21 並存；授權與服務確認後才決定 production zoom ceiling。
- A.3 仍使用現代 OSM coastline 與現代 DEM；這些是尺度與材質參考，不是 1949 戰場史料。
- 手機畫面優先確保繁中不溢出與控制可用，細部 debug panel 仍屬 desktop／development review。

## Recommendation

建議通過 A.3 的「歷史藝術方向與來源安全架構」進入人工審查，但維持航照 gate blocked：先向資料提供者取得書面 runtime／衍生／GitHub／再散布條款，並確認允許的 attribution、zoom、cache 與小範圍 derivative；取得後才開啟 1945 pixel adapter、對齊驗證與真實 aerial screenshots。不要開始 Gate B、Units、Routes、Timeline、Events、Village、Buildings、Photogrammetry、Soldiers 或 battle effects。

## Screenshot Review Questions

1. 地形是否更容易看見？**是**；亮度、低綠色主導與 warm-gray／paper palette 讓高程與海岸輪廓在寬景更容易辨識。
2. 是否降低黑壓、過強橄欖綠與 game／military GIS 感？**大致是**；仍保留技術 overlay 與 3D relief，這是原型刻意留下的可審查性。
3. 繁中是否為 primary？**是**；English 只保留為 secondary label／technical stats。
4. relief 是否仍存在？**是**；B quality、1.5×、smooth normals、sun shadow、AO 與 relief lighting 保留。
5. 是否具備真正的 1945 aerial identity？**尚未**；只能誠實呈現來源審查狀態，因權利未明不綁像素。
6. 是否完成 aerial／DEM alignment？**否**；狀態為 `SOURCE REVIEW`，沒有虛構 RMSE。
7. coverage edge 是否自然？**未渲染航照 coverage edge**；因此不會有矩形硬切或假缺圖邊界，正式整合時必須使用 feathered mask。
8. 沒有 aerial 時是否仍一致？**是**；歷史色調與地形浮雕可獨立成立，沒有用現代衛星圖冒充歷史影像。
9. ocean／background 是否更自然？**是**；使用 A.2 infinite atmospheric shell，降低純黑與陸地截斷感，保留低彩度霧與微光。
10. 是否值得延伸？**是，但前提是先完成書面授權與 alignment QA**；否則不應進入真實 aerial pixel integration。
