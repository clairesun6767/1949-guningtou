# V3.0 今昔頁面影像與授權稽核

## 已整合公開影像

| Asset | Local file | Author / date | Licence | Source page | Use |
| --- | --- | --- | --- | --- | --- |
| Guningtou Beach | `public/media/guningtou/then-now/guningtou-beach-2015.jpg` | rheins / 2015-01-01 | CC BY 3.0 | [Commons file](https://commons.wikimedia.org/wiki/File:%E5%8F%A4%E5%AF%A7%E9%A0%AD%E6%B5%B7%E7%81%98_-_Guningtou_Beach_-_2015.01_-_panoramio.jpg) | 古寧頭海岸現況參考 |
| Li Guangqian Shrine | `public/media/guningtou/then-now/li-guangqian-shrine-2014.jpg` | rheins / 2014-05-03 | CC BY 3.0 | [Commons file](https://commons.wikimedia.org/wiki/File:%E6%9D%8E%E5%85%89%E5%89%8D%E5%B0%87%E8%BB%8D%E5%BB%9F_-_General_Li_Guangqian_Temple_-_2014.05_-_panoramio.jpg) | 祭祀與記憶地景 |
| Li Ancestral Hall | `public/media/guningtou/then-now/peace-li-ancestral-hall-2019.jpg` | Koala0090 / 2019-07-15 | CC BY-SA 4.0 | [Commons file](https://commons.wikimedia.org/wiki/File:%E9%87%91%E9%96%80%E5%92%8C%E5%B9%B3%E7%B4%80%E5%BF%B5%E5%9C%92%E5%8D%80%E6%9D%8E%E6%B0%8F%E5%AE%97%E7%A5%A0.jpg) | 和平紀念園區 |
| Lincuo Memorial | `public/media/guningtou/then-now/lincuo-memorial-2019.jpg` | Koala0090 / 2019-07-15 | CC BY-SA 4.0 | [Commons file](https://commons.wikimedia.org/wiki/File:%E5%8F%A4%E5%AF%A7%E9%A0%AD%E6%88%B0%E5%BD%B9%E6%9E%97%E5%8E%9D%E6%B5%B4%E8%A1%80%E6%AE%B2%E6%95%B5%E7%B4%80%E5%BF%B5%E7%A2%91.jpg) | 林厝紀念地景 |

每筆都在 `src/data/mediaCatalog.ts` 保留 `author`、`capturedAt`、`licenseUrl`、`rights` 與 `sourceUrl`。本專案只保存縮放後 display copy；原始 Commons 檔案頁是授權與 attribution 的依據。

## 暫不整合

- 國家公園與縣府官方頁面中的圖片：除個別特別聲明外，金門國家公園政府網站資料開放宣告允許重製、改作與公開傳輸並要求註明出處；W012 兩張官方照片已依此接入。
- W011、W016、W027、嚨口二營區、東一點紅、鎮中堡及湖南高地候選照片：仍須先核對個別作者／授權／地點識別。
- `.local/aerial-poc/` 中的原始或快取航照、DEM、tile 與 screenshot：不屬公開網站資產，也不納入本輪 commit。
