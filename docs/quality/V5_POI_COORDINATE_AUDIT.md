# V5 POI 座標對照表

本表以 V4 commit `33c6c18f56a0ca8f629c701322147ac47e64b5f5` 為舊值基準，對照 V5 `data/poi.json`。座標均以 `[latitude, longitude]`、WGS84 顯示。`modern_verified` 是今日可定位的現代地點；`representative` 是地名／範圍的現代代表點；`historical_review` 與 `unresolved` 不得讀成 1949 精確戰鬥點。

| ID | 地點 | 舊座標 | V5 座標 | 類型／狀態 | 來源或處理 |
|---|---|---:|---:|---|---|
| POI-0001 | Longkou (Lungkou) | 24.467, 118.309 | 24.467, 118.309 | historical_area / historical_review | 海岸與登陸區域；保留研究索引，無安全單點來源 |
| POI-0002 | Guningtou Beach (Beishan Section) | 24.478, 118.316 | 24.478, 118.316 | historical_area / historical_review | 海灘範圍，不代表整段海岸 |
| POI-0003 | Huwei | 24.471, 118.328 | 24.471, 118.328 | historical_area / historical_review | 地名與高地關係待史料核對 |
| POI-0004 | Housha | 24.464, 118.319 | 24.464, 118.319 | historical_area / historical_review | 同名地點歧義，未套用現代候選點 |
| POI-0005 | Lantso | 24.463, 118.310 | 24.463, 118.310 | historical_area / historical_review | 戰役區段，無精確訪客點來源 |
| POI-0006 | Guningtou (Beishan) | 24.478, 118.316 | 24.4795636, 118.3110958 | historical_area / representative | OSM node 2649812653，北山聚落代表點 |
| POI-0007 | Lintso (Lincuo) | 24.475, 118.313 | 24.4769467, 118.3137619 | historical_area / representative | OSM node 2649812691，林厝聚落代表點 |
| POI-0008 | Nanshan | 24.476, 118.318 | 24.4785262, 118.307432 | historical_area / representative | OSM node 2649812655，南山聚落代表點 |
| POI-0009 | Putou | 24.481, 118.310 | 24.481, 118.310 | historical_area / historical_review | 聚落／攻擊方向區域，未縮成單點 |
| POI-0010 | Hunan Heights | 24.460, 118.330 | 24.4552765, 118.3312015 | historical_area / representative | OSM node 10142312500；不是湖尾高地 |
| POI-0011 | Shuitou Pier | 24.446, 118.308 | 24.4157423, 118.2870693 | modern_site / modern_verified | OSM node 151020664；今日水頭碼頭，不等同 1949 登陸點 |
| POI-0012 | Chiunglin (Qionglin) | 24.452, 118.340 | 24.4546981, 118.3738444 | historical_area / representative | OSM node 2649812700，瓊林聚落代表點 |
| POI-0013 | Kuanyin Pavilion Hill | 24.467, 118.320 | 24.467, 118.320 | historical_area / historical_review | 高地範圍，未縮成單點 |
| POI-0014 | Shuangju Hill | 24.455, 118.323 | 24.4466867, 118.3583821 | historical_area / representative | OSM node 9016045553，雙乳山代表點 |
| POI-0015 | Huwei Heights | 24.472, 118.326 | 24.472, 118.326 | historical_area / historical_review | 與湖南高地分開保留，位置關係待審 |
| POI-0016 | Guningtou War Museum | 24.477, 118.320 | 24.4830889, 118.3211133 | modern_site / modern_verified | OSM node 151074070，現代戰史館 |
| POI-0017 | General Li Guangqian Temple | 24.473, 118.315 | 24.4683791, 118.3170101 | modern_site / modern_verified | OSM node 446443634，現代祭祀地點 |
| POI-0018 | Kinmen Peace Memorial Park | 24.477, 118.321 | 24.4755365, 118.3164686 | modern_site / representative | OSM node 4863684308，公園代表點 |
| POI-0019 | Andong Camp 1 | 24.477, 118.320 | 24.477, 118.320 | modern_site / unresolved | 戰後營區；尚無公開據點級來源 |
| POI-0020 | Guningtou Broadcasting Station | 24.479, 118.317 | 24.4889168, 118.3131069 | modern_site / modern_verified | OSM node 474838427，北山播音牆／站 |
| POI-0021 | Beishan Cliff | 24.483, 118.315 | 24.4892385, 118.3137107 | historical_area / representative | OSM node 8420024317，斷崖代表點，非營區 |
| POI-0022 | Guningtou Memorial Arch | 24.475, 118.318 | 24.4765937, 118.3154305 | modern_site / modern_verified | OSM node 6583207786，現代入口地標 |
| POI-0023 | Andong Camp 2 Road | 24.470, 118.310 | 24.470, 118.310 | historical_area / historical_review | 道路不等於戰役路線或營區邊界 |
| POI-0024 | Guningtou Area Defense Bunkers | 24.476, 118.317 | 24.476, 118.317 | uncertain_area / unresolved | 分散工事群，沒有安全單一碉堡點 |
| POI-0025 | Mount Taiwu (Xu Bo's Hideout) | 24.430, 118.350 | 24.430, 118.350 | historical_area / historical_review | 廣域躲藏敘事，沒有洞穴級座標 |

## 統計

- 核對：25/25。
- 使用新的 OSM 現代／代表點：13 處（其中 5 處 `modern_verified`、8 處 `representative`）。
- 保留原索引但明確降級為研究狀態：12 處（10 `historical_review`、2 `unresolved`）。
- 以位置不明而隱藏的標記：0；改為在列表、詳情與選取標記上顯示定位依據，避免誤讀。
- 湖尾高地（POI-0015）與湖南高地（POI-0010）沒有合併。
