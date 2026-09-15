# Gate A.3 — 1945 歷史航照來源審計

## 審計範圍

- 審計日期：2026-09-15（Asia/Taipei）
- 目標：確認「金門舊航照影像(1945)」是否可安全用於本原型的瀏覽器執行時、GitHub 儲存庫、衍生材質與截圖。
- 審計方法：唯讀檢查官方圖層說明頁、官方 WMTS GetCapabilities，以及官方航空照片申請文件；未下載或提交任何航照影像 tile。
- 原始指定頁：<https://gissrv4.sinica.edu.tw/gis/kinmen.html>

## 審計結果

| 欄位 | 實際觀測／判定 |
| --- | --- |
| Provider | 中央研究院人社中心／地理資訊科學研究專題中心 |
| Dataset | 金門百年歷史地圖 WMTS 服務 |
| Year | 1945 |
| Layer Name | `金門舊航照影像(1945)` / `Kinmen_1945` |
| Service Type | OGC WMTS 1.0.0；KVP 與 RESTful capabilities 均由服務宣告 |
| Endpoint | `https://gis.sinica.edu.tw/kinmen/wmts`；capabilities：`https://gis.sinica.edu.tw/kinmen/wmts/1.0.0/WMTSCapabilities.xml` |
| CRS | 圖層 bounding box 以 WGS 84 經緯度宣告；TileMatrixSet `GoogleMapsCompatible` 使用 EPSG:3857（`urn:ogc:def:crs:EPSG:6.18:3:3857`）。 |
| Bounds | west `118.2727648`, south `24.3437997`, east `118.4966956`, north `24.5362935`（WGS84）。此為官方圖層範圍，不是本專案猜測值。 |
| Resolution | 服務格式為 `image/png`；capabilities 宣告 GoogleMapsCompatible matrix 0–21、256×256 tile。圖層預覽的 metadata 另宣告 `minzoom=0`、`maxzoom=19`、`profile=mercator`。服務未在本審計中宣告 1945 圖層的原始地面解析度；不得把 WMTS 縮放層級當成原始照片解析度。 |
| Coverage | 官方 bounds 覆蓋金門東南／中部一帶，並非整個本 A.2 戰略區域；1945 航照只可在上述 bounds 內被視為候選歷史影像來源。 |
| License | 官方圖層預覽頁頁尾寫明：「版權聲明：中央研究院版權所有，非經允許，不得作為商業使用。」本審計未找到允許 GitHub 再散布、衍生材質、公開網站 runtime 轉發或商業使用的明確授權條款。 |
| Attribution | `中央研究院人社中心 地理資訊科學研究專題中心`；圖層預覽的 tile attribution 為 `Academia Sinica contributors`。正式整合前應以提供者確認的署名文字為準。 |
| Download Permission | 未確認。圖層服務公開提供 capabilities／tile 操作，但公開讀取不等同於取得原始影像或高解析檔下載權。官方申請文件要求以影像序號、用途與聯絡資料提出高解析複製申請。 |
| Derivative Permission | 未確認。未找到允許將 tile 拼接、裁切、重投影、壓縮為 WebP/JPEG/KTX2 或製成 Three.js 貼圖的明確條款。 |
| Redistribution Permission | 未確認。未找到允許將原始 tile、拼接影像、衍生 atlas 或包含其像素的 GitHub commit 公開散布的明確條款。 |
| Runtime Usage Permission | 公開 WMTS 讀取端點在技術上可連線，但 runtime 讀取／快取／公開展示的權利範圍未由官方頁面明確授權；暫不啟用。 |
| GitHub Commit Permission | 未確認；本分支不提交 1945 航照像素、tile cache、拼接圖或由其產生的材質。 |
| Known Restrictions | 非經允許不得作為商業使用；高解析照片需依官方文件提出專案申請。舊指定 URL 目前回傳系統錯誤頁，實際可核查的服務入口為上述 `gis.sinica.edu.tw/kinmen/` 與 WMTS capabilities。 |
| Recommended Integration | 先保留 year-aware `HistoricalAerialLayer`／provider 介面，狀態固定為 rights-blocked；UI 顯示 `1945 航照 — 資料授權確認中`。取得書面授權後，才依官方 bounds／CRS 進行小範圍對齊與 runtime / local adapter 實作。 |
| Verdict | **BLOCKED — RIGHTS UNCLEAR** |

## 來源證據

1. [中央研究院金門百年歷史地圖 WMTS 服務](https://gis.sinica.edu.tw/kinmen/)：列出 `Kinmen_1945` 圖層與服務網址。
2. [Kinmen_1945 圖層預覽與詮釋資料](https://gis.sinica.edu.tw/showwmts/index.php?s=kinmen&l=Kinmen_1945)：列出 bounds、PNG、mercator、zoom metadata、tile attribution 與版權聲明。
3. [WMTS GetCapabilities](https://gis.sinica.edu.tw/kinmen/wmts/1.0.0/WMTSCapabilities.xml)：列出 `Kinmen_1945`、WGS84 bounds、EPSG:3857 GoogleMapsCompatible tile matrix 與 tile format。
4. [美國國家檔案館典藏臺灣航空照片複製申請步驟](https://gissrv4.sinica.edu.tw/gis/help/fpmtw-apply.pdf)：說明高解析影像需依影像序號、用途與聯絡資料提出申請；此文件不是本專案取得再散布授權的證明。
5. [美國國家檔案館典藏臺灣舊航空照片檢索系統操作手冊](https://gissrv4.sinica.edu.tw/gis/help/fpmtw.pdf)：說明歷史航空照片資料的年代與檢索背景。

## 執行決定

Gate A.3 仍繼續，但採「權利阻擋」路線：

- 不下載、不快取、不提交 1945 航照像素。
- 不以現代衛星圖、任意灰階圖或 AI 生成圖假裝 1945 航照。
- 完成歷史色調、亮度、繁體中文 UI、模式切換、來源狀態與 adapter 架構。
- 1945 航照模式只呈現合法的 source-review 佔位與 debug metadata，不宣稱已完成影像對齊。
- 在取得明確書面授權前，Gate A.3 不得標示為 `READY FOR HUMAN REVIEW`。
