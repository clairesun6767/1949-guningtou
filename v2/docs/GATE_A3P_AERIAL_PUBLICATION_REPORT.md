# Gate A.3P — Authorized Low-Resolution Aerial Publication Report

日期：2026-09-16（Asia/Taipei）  
Branch：`feature/2.0-art-region-environment-poc`

## 發布決定

使用者已確認取得目前 Kinmen 航照 POC 的公開授權。本次 GitHub／GitHub Pages bundle 採低流量方案，只發布三個年度的 z12 derived mosaic 與必要 metadata；不發布原始 WMTS tile、高解析度 higher-zoom review、含航照像素的 benchmark screenshots 或廈門八張候選 JPEG。

授權狀態已記錄為 `APPROVED`，但不把它解讀成來源機構的通用開放資料授權；公開範圍限於本專案的低解析度 POC review。

## 公開資產

| 資產 | 用途 | 狀態 |
| --- | --- | --- |
| `public/.local/aerial-poc/1944/mosaic-z12.png` | 1944 單年航照 | GitHub／Pages |
| `public/.local/aerial-poc/1945/mosaic-z12.png` | 1945 單年航照 | GitHub／Pages |
| `public/.local/aerial-poc/1958/mosaic-z12.png` | 1958 fallback 航照 | GitHub／Pages |
| `public/.local/aerial-poc/smart/smart-composite-z12.png` | 1944／1945 primary、1958／BASE fallback 的視覺 composite | GitHub／Pages |
| `public/.local/aerial-poc/manifest.json` | bounds、tile provenance、byte size、publication boundary | GitHub／Pages |
| `valid-mask-z12.png`、`source-mask-z12.png` | coverage／source-year debug | GitHub／Pages |

總公開 payload 約 1.5 MB，不包含 z15–z17 tiles、local review screenshots 或廈門 JPEG。

## Runtime 使用方式

公開頁面只有在 URL 明確帶入 `aerial=local` 時才載入航照像素，例如：

`/1949-guningtou/v2/region/?historical=H3&aerial=local&year=1958&mode=single`

若資產不存在、manifest 未標記 `APPROVED` 或沒有 `aerial=local`，會回退現代 DEM／classification，不產生 broken image，也不請求遠端 WMTS。

## 未公開範圍

- `z15`／`z16`／`z17` 古寧頭 higher-zoom mosaic 與 tiles：仍為 local review。
- `.local/aerial-poc/screenshots/`：含航照像素，保持 ignored，避免流量與不必要的圖片散布。
- `.local/aerial-poc/xiamen/`：廈門八張仍是 `XIAMEN_WWII_AERIAL_UNVERIFIED_01`，日期／館藏／GCP QA 未完成，不因 Kinmen 低解析度授權而自動轉為公開資料。

## 驗證

- `npm.cmd run test:v2`：46／46 passed。
- `npm.cmd run build`：280 pages built。
- 實際瀏覽器已確認三年度切換與低解析度縮圖載入；缺資產時仍維持 graceful fallback。
