# 《昔日戰場・今日古寧頭》V3.0 研究紀錄

研究日期：2026-10-19（Asia/Taipei）<br>
研究分支：`feature/guningtou-then-now-v2`<br>
研究範圍：戰後軍事據點、聚落／海岸地景、紀念與祭祀、保存活化，以及可公開使用的現況影像。

## 方法與界線

- 先查金門國家公園、內政部國家公園署、金門縣政府、金門觀光旅遊網與國防部等官方入口，再以 Wikimedia Commons 個別檔案頁核對影像作者、日期與授權。
- `data/sources.json` 仍是唯一 authoritative source catalog；本紀錄與 `data/then-now/site-inventory.json` 不是第二套歷史資料庫。
- 不新增 canonical Location、不重算座標、不新增 route/terrain geometry；inventory 的 `location.coordinates` 固定為 `null`，只引用既有 `POI-*`。
- 「研究中」與「部分支持」不會因網頁呈現而升格為 1949 戰役事實。

本輪另依使用者上傳 `Kinmen_Guningtou_Locations.xlsx` 直接更新網站使用的 POI 座標。這是資料套用，不是本研究紀錄中的官方座標查證；所有 38 筆 POI 均標記為 `user_specified`，並以 `SRC-0058` 追溯來源。XLSX 第 23、24 行取消獨立公開展示；第 32 行改名為嚨口一營區；第 35、36 行合併為北山共軍指揮所。

## 第一輪官方研究結果

| 題目 | 研究結論 | 專案處理 |
| --- | --- | --- |
| W013 | 官方資料將其稱為安東一營區，並說明與 W011/W012 的系列關係及後續整建／活化。 | 保留 W013 展示卡與來源連結；不把現況結構寫成 1949 原始工事。 |
| W012 | 本輪網站座標依使用者上傳 Kinmen_Guningtou_Locations.xlsx 指定為 24.4745801543384, 118.332390528511。 | `POI-0026` 保留為 W012 營區，`POI-0023` 仍保留為研究紀錄但取消獨立公開展示；網站不把本輪數值宣稱為官方實測。 |
| W011 | 可由官方 3D／系列資料發現，但個別清冊與可公開影像仍不足。 | 置於 inventory／研究中，不新增座標。 |
| W016 | 官方啟用公告明確對應為古寧頭三營區，位於古寧頭戰史館後方。 | 修正 V2 文案；不新增 canonical Location。 |
| W027 | 官方專題記錄湖下一營區的戰後海防功能、坑道、哨所及 1986–1988 建造脈絡。 | 明確標為戰後設施，不能回推為 1949 原始工事。 |
| 嚨口二營區／嚨口一營區／東一點紅／鎮中堡 | 縣府資料顯示仍在會勘、保存與活化討論／推進中。 | 納入 inventory 與研究優先級，不創設戰役 geometry；嚨口一營區沿用原嚨口堡別名。 |
| 湖尾高地與湖南高地 | 國防部資料與金門國家公園資料分別使用兩個名稱；不能因相近名稱直接合併。 | 在 inventory 中維持 `POI-0015` 湖尾高地與湖南高地的名稱區分。 |
| 戰後制度轉折 | 官方資料可支持 1992 解除戰地政務、1993 開放觀光、1995 國家公園成立等時間骨架。 | 作為戰後時間研究來源，不改寫 1949 timeline。 |
| 祭祀與紀念 | 金門縣政府記錄國共軍陣亡將士暨先靈祭祀；總統府記錄戰役週年公祭與和平語境。 | 分入 ritual／memorial 層，不轉成戰役單一因果結論。 |

## 影像研究與整合

本輪實際下載的影像均來自 Wikimedia Commons 個別檔案頁，保留作者、拍攝日期、來源頁、Creative Commons 授權與本專案的 display-copy 說明：

- 古寧頭海灘（2015）— rheins，CC BY 3.0。
- 李光前將軍廟（2014）— rheins，CC BY 3.0。
- 和平紀念園區李氏宗祠（2019）— Koala0090，CC BY-SA 4.0。
- 林厝浴血殲敵紀念碑（2019）— Koala0090，CC BY-SA 4.0。

W011、W016、W027 的官方頁面仍作為研究／現況入口；W012 官方頁的政府網站資料開放宣告已核對，兩張據點現況影像因此接入公開資產。未核實的 W16、湖南高地與其他搜尋候選影像仍不納入公開資產。

## 審核後續

需要人工確認的事項仍保留在 `data/then-now/site-inventory.json` 的 `humanReview`：

1. 嚨口海岸、嚨口二營區與各防禦據點的現地邊界與進入狀態。
2. 湖尾／湖尾高地／湖南高地之間的官方地名對應，不得以畫面相似或最近 POI 代替。
3. W011、W012、W016、W027 的可公開影像、現況開放狀態與個別設施清冊。
4. 北山共軍指揮所的正式歷史名稱、位置與 surviving structure 證據。

## 來源索引

本輪研究來源為 `SRC-0039`–`SRC-0055`；前一版使用者座標表為 `SRC-0056`，前一輪 chat.md XLS 座標為 `SRC-0057`，本次 Kinmen_Guningtou_Locations.xlsx 另以 `SRC-0058` 登錄，完整 metadata 在 `data/sources.json`。主要官方入口包括：

- [古寧頭三營區啟用公告](https://www.taiwan.nps.gov.tw/home/zh-tw/news/25845)
- [湖下一營區專題](https://www.taiwan.nps.gov.tw/home/zh-tw/topic/18061.html)
- [安東一營區專題](https://www.taiwan.nps.gov.tw/home/zh-tw/topic/18475.html)
- [古寧頭區戰地文化景觀研究](https://www.taiwan.nps.gov.tw/home/zh-tw/topic/18647)
- [湖南高地官方據點資料](https://www.kmnp.gov.tw/ch/touristInfo/recreation-sites/46)
- [金門觀光戰役紀念路線](https://www.kinmen.travel/zh-tw/discover/navigation)
- [金門縣政府嚨口二營區會勘資料](https://www.kinmen.gov.tw/News_Content2.aspx?n=98E3CA7358C89100&s=A0A158E23410A02A&sms=BF7D6D478B935644)
- [解除戰地政務與國家公園沿革](https://kmfinance.kinmen.gov.tw/News.aspx?Create=1&PageSize=999&n=55FDE4EAE7CDA1E6&page=220&sms=4FEFD09995C4BB81)
- [古寧頭先靈祭典](https://www.kinmen.gov.tw/News_Content2.aspx?n=98E3CA7358C89100&s=9D8905D3A7D05A93&sms=BF7D6D478B935644)
