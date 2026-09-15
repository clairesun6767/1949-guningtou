# 廈門 1943-11-22 航照原型與目前進度報告

> 報告日期：2026-09-15（Asia/Taipei）
> 專案：1949 古寧頭 2.0 — Gate A.3P 研究原型
> Git 分支：`feature/2.0-art-region-environment-poc`

## 1. 本次完成事項

- 將使用者提供的八張廈門黑白航照整理為可由網站讀取的研究資產。
- 保留原始上傳順序：第一批五張為 A-01–A-05，後續三張為 B-01–B-03。
- 建立 `manifest.json` 與 TypeScript source registry，記錄尺寸、bytes、SHA-256、批次與狀態。
- 在區域頁接入「廈門航照／XIAMEN AERIAL」證據瀏覽面板：可切換八張縮圖、預覽與開啟原圖。
- 明確禁止將這八張影像當成已正射配準的 3D 地圖貼圖；目前是 `EVIDENCE GALLERY ONLY`。
- 整理 NHHC、NARA、USAAF、公開轉載副本與 1946 歷史地圖的五級搜尋結果。

## 2. 影像 provenance 與權利邊界

| 欄位 | 判定 |
| --- | --- |
| 使用者宣稱日期 | `1943-11-22` |
| 第一批原始標註 | 曾稱為 1944；後續更正，保留作審計資訊 |
| 官方館藏編號 | 尚未驗證 |
| 空間配準 | 未完成；無 GCP、RMSE、flight／frame／spot |
| 影像用途 | 研究證據瀏覽、局部比對、後續拼接研究 |
| 3D 貼圖用途 | 暫不啟用；避免產生假 coverage 或假正射影像 |
| 權利狀態 | `BLOCKED — RIGHTS UNCLEAR` |
| GitHub 狀態 | 本分支按使用者要求提交研究原型資產；不代表取得官方館藏再散布授權 |

照片內可辨識的印刷日期似乎另有 `53-8-12`／`53-8-20`，與 `1943-11-22` 不一致；本報告不自行解讀，標記為待考。

## 3. 依指定順序的來源研究結果

### 第一優先：NHHC — Milton E. Miles Collection

NHHC 官方 `UA 25.01` 目錄的 `Box 17 / S-2` 明列 `panoramic of Amoy & Kulangsu`，是目前最接近本批影像主題的館藏線索。館藏頁沒有公開列出這八張照片的逐張 negative、print、envelope 或 frame 編號，因此目前只能記為 `strong archival lead`，不能宣稱已完成比對。

來源：[NHHC — UA 25.01 RADM Milton E. Miles Collection](https://www.history.navy.mil/our-collections/photography/alphabetical---donations0/m/ua-25-01-radm-milton-e--miles-collection.html)

### 第二優先：NARA RG 373

NARA 官方研究指南說明 RG 373 的 JX 系列約有 1933–1945 年日本軍航照，需先用 degree-square overlay，再由 flight／date／mission／spot／exposure 追到 film can。研究目標暫記為 `24N118E / Amoy / Hsia-men / Kulangsu`；公開搜尋尚未找到 `1943-11-22` 的精確 flight／spot／film-can 編號。

來源：[NARA — Japanese Flown Foreign Aerial Photography (JX) in RG 373](https://www.archives.gov/research/cartographic/aerial-photography/rg-373-jx-foreign-aerial-photography)

### 第三優先：USAAF 第 14 航空軍／第 21 攝影偵察中隊

第 21 攝影偵察中隊在中國戰區執行偵察；公開的中國航照副本可保留原始題註、座標、黑白媒材與 `21ST PHOTO. RCN. SQ. - 14TH U.S.A.A.F.` 格式。這證明了可用「題註格式＋地名／座標＋影像形狀」反查，但本次仍未找到廈門的對應公開影像。

來源：[Historical Photographs of China — USAAF aerial view / Bi-s119](https://www.hpcbristol.sjtu.edu.cn/visual/bi-s119)

另有研究文章提到 1943-11-22 的第 21 中隊航照卷，但內容指向臺灣，不足以驗證本批廈門照片；因此只列為方法與日期交叉參考，不列為 provenance 證明。

### 第四優先：Flickr／Wikimedia／Internet Archive

目前公開索引找到的 Xiamen aerial 主要是現代照片、ISS 影像或一般航空照片；`Amoy, from Kulangseu` 是 1885 年出版物的圖像，不是 1943 年美軍航照。沒有找到能反推出本批影像原始館藏號的公開副本。

來源：[Wikimedia Commons — Aerial photographs of Xiamen](https://commons.wikimedia.org/wiki/Category:Aerial_photographs_of_Xiamen)、[Amoy, from Kulangseu（1885）](https://commons.wikimedia.org/wiki/File:Amoy,_from_Kulangseu.jpg)

### 第五優先：1946 HSIA-MEN 1:12,500 Tier B fallback

中央研究院東南沿海百年歷史地圖 WMTS 明確列出 `1946 HSIA-MEN [12500] : Amoy_12500_1946`。它是歷史地圖，不是航照；可在無航照區域作 Tier B 空間／城市紋理 fallback。

來源：[中央研究院東南沿海百年歷史地圖 WMTS](https://gis.sinica.edu.tw/southeast_coast/)

## 4. 原型整合方式

目前區域頁的新增面板位於歷史來源資訊下方：

- `A-01`–`A-05`：第一批五張。
- `B-01`–`B-03`：後續三張。
- 點擊縮圖可切換預覽；點擊「開啟原圖」可另開完整 JPEG。
- 預覽只代表影像證據，不代表影像已落在地圖上正確位置。
- 原有 1944／1945／1958 航照 adapter 仍維持原先的權利阻擋與 local POC 邊界，沒有將未配準的廈門照片硬接進 Three.js aerial shader。

## 5. 檔案與資料路徑

- 原型影像：`public/research/xiamen-1943/*.jpg`
- 機讀清單：`public/research/xiamen-1943/manifest.json`
- 資產說明：`public/research/xiamen-1943/README.md`
- UI source registry：`v2/config/xiamen1943Aerial.ts`
- 證據瀏覽面板：`v2/app/XiamenHistoricalAerialPanel.tsx`
- 本報告：`v2/docs/XIAMEN_1943_AERIAL_POC_REPORT.md`

## 6. 下一步

1. 向 NHHC 索取 `UA 25.01 / Box 17 / S-2 / panoramic of Amoy & Kulangsu` 的完整影像清單、envelope／negative／print 編號、原始題註與複製條件。
2. 向 NARA 查詢 `RG 373 / 24N118E` overlay 上的 flight、mission、spot、exposure、film-can 與數位複製狀態。
3. 以廈門現代海岸線、港灣、道路、水體與可辨識建物建立 GCP；先做單張 registration QA，再判定是否能拼接。
4. 只有在日期、館藏號與再利用權利均獲確認後，才把局部影像轉為真正的 map overlay／derivative texture。
5. 無航照區域暫用 `Amoy_12500_1946` 進行 Tier B fallback，並保留歷史地圖與航照的來源標籤差異。
