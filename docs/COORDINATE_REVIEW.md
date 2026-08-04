# 古寧頭戰役 POI 座標校對清單

> 以下為目前 HeroMap 使用的座標，來源於 Battlefield_OS `poi.json`。
> 請逐項驗證實際位置，修正後回報。使用 Google Maps 或 Google Earth 可精確定位。

---

## 一、POI 標記座標（目前使用中）

| # | POI ID | 中文名 | 英文名 | 類別 | 目前緯度 | 目前經度 | 驗證狀態 |
|---|---|---|---|---|---|---|---|
| 1 | POI-0001 | 嚨口 | Longkou | Landing Beach | 24.467 | 118.309 | ⬜ 待驗證 |
| 2 | POI-0002 | 古寧頭海灘（北山段） | Guningtou Beach | Landing Beach | 24.478 | 118.316 | ⬜ 待驗證 |
| 3 | POI-0003 | 湖尾 | Huwei | Landing Beach | 24.471 | 118.328 | ⬜ 待驗證 |
| 4 | POI-0004 | 后沙 | Housha | Landing Beach | 24.464 | 118.319 | ⬜ 待驗證 |
| 5 | POI-0005 | 蘭厝 | Lancuo | Landing Beach | 24.463 | 118.310 | ⬜ 待驗證 |
| 6 | POI-0006 | 古寧頭（北山） | Beishan | Village | 24.478 | 118.316 | ⬜ 待驗證 |
| 7 | POI-0007 | 林厝 | Lincuo | Village | 24.475 | 118.313 | ⬜ 待驗證 |
| 8 | POI-0008 | 南山 | Nanshan | Village | 24.476 | 118.318 | ⬜ 待驗證 |
| 9 | POI-0009 | 埔頭 | Putou | Village | 24.481 | 118.310 | ⬜ 待驗證 |
| 10 | POI-0010 | 湖南高地 | Hunan Highland | Command Post | 24.460 | 118.330 | ⬜ 待驗證 |
| 11 | POI-0011 | 水頭碼頭 | Shuitou Pier | Command Post | 24.446 | 118.308 | ⬜ 待驗證 |
| 12 | POI-0012 | 瓊林 | Qionglin | Command Post | 24.452 | 118.340 | ⬜ 待驗證 |
| 13 | POI-0013 | 觀音亭山 | Guanyinting Hill | High Ground | 24.467 | 118.320 | ⬜ 待驗證 |
| 14 | POI-0014 | 雙乳山 | Shuangru Hill | High Ground | 24.455 | 118.323 | ⬜ 待驗證 |
| 15 | POI-0015 | 湖尾高地 | Huwei Height | High Ground | 24.472 | 118.326 | ⬜ 待驗證 |
| 16 | POI-0016 | 古寧頭戰史館 | Guningtou Museum | Memorial | 24.477 | 118.320 | ⬜ 待驗證 |
| 17 | POI-0017 | 李光前將軍廟 | General Li Temple | Memorial | 24.473 | 118.315 | ⬜ 待驗證 |
| 18 | POI-0018 | 金門和平紀念園區 | Peace Memorial Park | Memorial | 24.477 | 118.321 | ⬜ 待驗證 |
| 19 | POI-0019 | 安東一營區 | Andong Camp 1 | Military Facility | 24.477 | 118.320 | ⬜ 待驗證 |
| 20 | POI-0020 | 古寧頭播音站 | Guningtou Broadcast | Military Facility | 24.479 | 118.317 | ⬜ 待驗證 |
| 21 | POI-0021 | 北山斷崖 | Beishan Cliff | Coastal Defense | 24.483 | 118.315 | ⬜ 待驗證 |
| 22 | POI-0022 | 古寧頭牌樓 | Guningtou Arch | Road | 24.475 | 118.318 | ⬜ 待驗證 |
| 23 | POI-0023 | 安東二營區道路 | Andong Camp 2 Road | Road | 24.470 | 118.310 | ⬜ 待驗證 |
| 24 | POI-0024 | 古寧頭防禦碉堡遺跡 | Bunker Ruins | Bunker | 24.476 | 118.317 | ⬜ 待驗證 |
| 25 | POI-0025 | 太武山 | Taiwu Mountain | Tunnel | 24.430 | 118.350 | ⬜ 待驗證 |

---

## 二、登陸路線（解放軍，廈門→古寧頭）

### 路線 A：第 244 團 → 嚨口
```json
[
  [24.450, 118.080],  // 廈門出發點
  [24.455, 118.150],
  [24.460, 118.220],
  [24.465, 118.270],
  [24.467, 118.309]   // 嚨口登陸點
]
```

### 路線 B：第 251 團 → 古寧頭
```json
[
  [24.450, 118.080],  // 廈門出發點
  [24.458, 118.160],
  [24.468, 118.240],
  [24.475, 118.280],
  [24.478, 118.316]   // 古寧頭登陸點
]
```

### 路線 C：第 253 團 → 湖尾
```json
[
  [24.450, 118.080],  // 廈門出發點
  [24.452, 118.180],
  [24.458, 118.240],
  [24.465, 118.290],
  [24.471, 118.328]   // 湖尾登陸點
]
```

---

## 三、反擊路線（國軍）

### 路線 D：湖南高地 → 古寧頭
```json
[
  [24.460, 118.330],  // 湖南高地
  [24.465, 118.325],
  [24.470, 118.320],
  [24.475, 118.316],
  [24.478, 118.316]   // 古寧頭
]
```

---

## 四、1944 航照現況

| 項目 | 狀態 |
|---|---|
| 來源 | 中央研究院 GIS 中心 · 金門百年歷史地圖 WMTS |
| QLR 檔案 | `C:\Users\user\Downloads\金門舊航照影像(1944).qlr` |
| KML 檔案 | `C:\Users\user\Downloads\金門舊航照影像(1944).kml` |
| 圖磚 URL | `file-exists.php?img=Kinmen_1944-png-{z}-{x}-{y}`（PHP 腳本，非標準 WMTS） |
| 瀏覽器可用 | ❌ 僅支援 QGIS 桌面軟體載入 |
| 替代方案 | 需從 QGIS 匯出特定區域為靜態 GeoTIFF/PNG，再裁切為標準圖磚 |

---

## 五、修正方式

1. 用 Google Maps 逐一搜尋上述 POI 中文名稱，比對座標
2. 標記「✅ 正確」或「✏️ 修正為 (lat, lng)」
3. 路線節點可直接在地圖上標註實際經過的地理點
4. 修正後回報，我立即更新 HeroMap 程式碼
