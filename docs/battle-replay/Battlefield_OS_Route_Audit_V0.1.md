# Battlefield_OS_Route_Audit_V0.1

稽核日期：2026-08-20  
範圍：Battlefield_OS 古寧頭戰役 3D Battle Viewer Route List V0.1，R01–R12。  
原則：本文件只做交叉比對與回報；不修改路線資料、Verified Location 座標或既有 KML，也不依現代道路重新計算路徑。

## 1. 結論摘要

- 正式戰役包的 `data/battles/guningtou-1949/routes.geojson` 目前是空的 `FeatureCollection`，`features` 數量為 0。
- 正式戰役包的 `events.json` 與 `units.json` 都是空陣列；`battle.json` 仍標示為 BR-1 coordinate calibration skeleton，`animationAuthorized` 為 `false`。
- 六處 canonical Location 均已有 Point geometry，但其中多數仍是 `area-only`、`probable` 或待人工確認的 legacy mapping，不能自動推導成歷史行軍路線。
- 全域 legacy data 可支持「登陸、向村落縱深推進、國軍反擊、解放軍殘部退至北端海岸」等事件關係；目前沒有一條 R01–R12 同時具備已核定的起點、終點、時間、部隊、行動與可追溯路徑證據，因此本次沒有 `SUPPORTED`。
- `data/route_database.json` 是 POI 關係／候選路線資料，含有 `Road Connection`、`Attack Direction`、`Retreat Route` 等項目，但沒有 R01–R12 對應 ID、source ID、event ID 或 unit ID；它只能作為候選關係，不能單獨提升歷史支持等級。
- 已找到既有 KML：`C:\Users\user\Downloads\guningtou_battle_routes_1949.kml`。它只包含 R01 一條概略線段；端點幾何比對通過，但其文字也明確說明不代表實際行軍道路。

本次狀態統計：`SUPPORTED 0`、`PARTIALLY_SUPPORTED 9`、`CONFLICT 0`、`NO_EVIDENCE 3`。沒有發現足以標記為 `CONFLICT` 的直接互斥史料；主要問題是證據不足、端點未定義、行動性質混合或路線重複。

## 2. 交叉比對範圍與證據限制

| 資料 | 查核結果 | 本次用途 |
| --- | --- | --- |
| `data/battles/guningtou-1949/battle.json` | BR-1 校準骨架；canonical package 尚未授權動畫 | 判斷正式資料是否已可承載 route |
| `data/battles/guningtou-1949/locations.geojson` | 6 個 Point；均 `manually-verified`，信心為 `probable` 或 `confirmed` | 只讀核對 KML 端點，不重算座標 |
| `data/battles/guningtou-1949/events.json`、`units.json` | 都是空陣列 | 確認正式包尚無事件／部隊綁定 |
| `data/battles/guningtou-1949/routes.geojson` | 空 `FeatureCollection` | 確認尚未正式匯入任何 route |
| `data/events.json` | 30 筆 legacy events；多數為 `partially_verified` 或 `conflicting_sources` | 查核事件時間、雙方與來源 |
| `data/timeline.json` | 123 筆 legacy timeline；主要條目為 `SRC-0004`、`SRC-0027` | 查核順序與敘事方向 |
| `data/interactive_timeline.json` | 12 段敘事段落；反擊與終局段落仍有 `needs_human_review` | 查核戰線階段，不視為精確軌跡 |
| `data/prc/pla_timeline.json` | 13 筆 `draft_PRC-D`，無 source ID | 只作解放軍視角的部分背景，不作已驗證路線 |
| `data/route_database.json` | POI 關係候選資料，沒有 provenance 欄位 | 查找是否存在同向候選或重複 |
| `data/unit_index.json` | 25 個 legacy unit mapping；關聯事件／來源欄位多為空 | 將可辨識單位映射為 U-ID |

特別限制：`安岐` 在 canonical Location 中有人工校準點，但全域 Timeline、Events 與 legacy POI 沒有核定的「安岐→某地」部隊行動條目；因此凡以安岐作為歷史路線起點或終點的項目，最多只能部分支持。

## 3. 六處正式 Location 對照

| Location ID | 名稱 | 座標（lon, lat） | 信心／精度 | 對路線的限制 |
| --- | --- | --- | --- | --- |
| `LOC-GUN-0001` | 嚨口登陸區 | `118.34905621282323, 24.46534210541434` | probable；area-only | 備註明示不可直接等同 legacy `POI-0001` 單一點位 |
| `LOC-GUN-0002` | 嚨口海岸 | `118.35212804669108, 24.464314013012007` | probable；area-only | 現代海岸參考點，不代表 1949 登陸線或完整歷史海岸 |
| `LOC-GUN-0003` | 安岐 | `118.32563349089101, 24.462804175249975` | probable；area-only | 沒有核定的 legacy POI mapping |
| `LOC-GUN-0004` | 安東二營區 | `118.332311827884, 24.473985205895303` | confirmed；exact | legacy road name 仍不足以證明營區 geometry |
| `LOC-GUN-0005` | 南山 | `118.30743595990603, 24.47855303214236` | probable；area-only | `legacyRefs` 指向 `POI-0008`，但備註仍要求人工審查 |
| `LOC-GUN-0006` | 北山 | `118.31120658183592, 24.47935230569504` | probable；area-only | `legacyRefs` 指向 `POI-0006`，但備註仍要求人工審查 |

## 4. 既有 Google Earth KML 查核

檔案：`C:\Users\user\Downloads\guningtou_battle_routes_1949.kml`  
內容：一條名為「安岐 → 北山｜概略推進」的 4 頂點 `LineString`，另含 1944 航拍 GroundOverlay。KML 的 overlay href 為：`D:/Hermes/Projects/1949/public/aerial-1944.png`。

| 項目 | KML 值 | 對照結果 |
| --- | --- | --- |
| 起點 | `118.3254951123289, 24.46262414755398` | 距 `LOC-GUN-0003` 約 24.4 m |
| 終點 | `118.3121639097031, 24.4793053941051` | 距 `LOC-GUN-0006` 約 97.0 m |
| 幾何檢查 | 4 個 LineString vertices | 以 250 m 審查容差，起終點均通過 |
| 歷史語義 | KML description 標示 `Approximate Route`，並說明不代表實際道路 | 只能保留為概略候選，不能視為 Verified route |
| 時間／部隊／來源 | KML 未提供 | 不能由 KML 單獨補齊 |

此處只做端點距離檢查，沒有重算中間路徑，也沒有覆寫任何 Location 座標。依本次任務的「只比對與回報」要求，KML 沒有轉寫進 `routes.geojson`。

## 5. R01–R12 稽核表

| Route ID | Status | Time | Side | Units | Origin | Destination | Action | Evidence | Source IDs | Event IDs | Recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R01 | `PARTIALLY_SUPPORTED` | 1949-10-25 凌晨；只支持登陸後向縱深推進時段，安岐節點未被 Timeline 明列 | PLA | `U-0021/U-0022/U-0023`（第244／251／253團，廣義第一梯隊） | `LOC-GUN-0003` 安岐；KML 端點通過，但歷史起點未獲文字核定 | `LOC-GUN-0006` 北山；KML 端點通過，legacy mapping 仍待審 | Advance；approximate | KML 只證明線段端點與 canonical 點接近；PRC draft `TIM-0025-02` 提到登陸部隊向北山等村落推進，但沒有安岐→北山的獨立史料 | `SRC-0001`（座標 only）、`SRC-0004`、`SRC-0027` | `EVT-0001`、`EVT-0028`、`EVT-0029`；另參 `PRC:TIM-0025-02`（draft） | **KEEP**（只維持為帶 disclaimer 的 KML 候選；正式 route 仍 pending） |
| R02 | `PARTIALLY_SUPPORTED` | 1949-10-25 00:30–06:00／凌晨；登陸與內陸推進有證據，安岐抵達時間無證據 | PLA | `U-0021/U-0022/U-0023` | `LOC-GUN-0001` 嚨口登陸區／`LOC-GUN-0002` 嚨口海岸；實際登陸點為多個海灘，非單一點 | `LOC-GUN-0003` 安岐；全域資料未以安岐作為登陸後端點 | Landing / Advance | `TLS-0003`、`TIM-0044`、`TIM-0046`–`TIM-0048`、`PRC:TIM-0025-01/02` 支持多點登陸與向內陸展開，但不支持安岐這個特定終點 | `SRC-0001`（座標 only）、`SRC-0004`、`SRC-0025`、`SRC-0027` | `EVT-0001`、`EVT-0009`、`EVT-0010`、`EVT-0011`、`EVT-0029` | **MODIFY**（移除未核定的安岐終點；改成多個登陸區至有證據的戰區關係，待人工核定） |
| R03 | `PARTIALLY_SUPPORTED` | 1949-10-25 凌晨；只支持登陸後向北山／古寧頭方向的概略關係 | PLA | `U-0021/U-0022/U-0023` | 嚨口／古寧頭北岸多點登陸區；不可簡化為單一 `LOC` | 北山戰區；可暫指 `LOC-GUN-0006`，但不是獨立核定終點 | Advance | `PRC:TIM-0025-02` 提及北山；legacy first-echelon events 支持登陸後推進。沒有獨立於 R02＋R01 的 route evidence | `SRC-0004`、`SRC-0027` | `EVT-0001`、`EVT-0029` | **REMOVE**（與 R02＋R01 的敘事鏈重疊，沒有獨立史料） |
| R04 | `PARTIALLY_SUPPORTED` | 1949-10-25 凌晨；南山被提及，但安岐→南山的時間順序未核定 | PLA | `U-0021/U-0022/U-0023`（僅廣義） | `LOC-GUN-0003` 安岐；沒有直接 movement record | `LOC-GUN-0005` 南山；`legacyRefs=POI-0008`，仍待人工審查 | Advance | `PRC:TIM-0025-02` 列出南山為登陸後縱深區域；相反地，`EVT-0004`／`TIM-0093` 明確記錄 10/26 國軍收復南山，不能倒推出安岐→南山線 | `SRC-0001`（座標 only）、`SRC-0004`、`SRC-0027` | `EVT-0004`、`EVT-0019`；另參 `TIM-0093` | **MODIFY**（若保留，須改成有證據的登陸區→南山方向候選，不能保留安岐為已證實起點） |
| R05 | `NO_EVIDENCE` | 無 route-specific time；`TIM-0073` 只描述 10/25 17:00 的戰線狀態 | PLA | 廣義 PLA 殘部；沒有單位被證明由北山移往林厝 | legacy `POI-0006` 古寧頭（北山）；不等同已核定 canonical 點 | legacy `POI-0007` 林厝；沒有 canonical Location ID | Advance / Battle Expansion；未證實 | `route_database` 的 `POI-0006→POI-0007` 是 `Road Connection`；`TIM-0073` 是「古寧頭—林厝—湖尾」防守線，`TIM-0069` 是林厝爭奪，均不證明北山→林厝部隊行軍 | `SRC-0004`、`SRC-0027`（僅事件／POI背景） | `EVT-0015`、`EVT-0019`；`TIM-0069`、`TIM-0073` | **REMOVE**（可留作戰線／POI 關係研究，不應作部隊 route） |
| R06 | `PARTIALLY_SUPPORTED` | 1949-10-25 下午至 17:00 左右；只有會合／戰線狀態，沒有 route-specific time | PLA | `U-0022/U-0023` 殘部的廣義映射；未證實同一部隊由林厝出發 | `POI-0007` 林厝 | 古寧頭戰區；沒有單一 canonical endpoint，`LOC-GUN-0006` 只代表北山部分 | Advance / Consolidation | `TIM-0068` 記錄第251團殘部與第253團在古寧頭附近會合，`TIM-0073` 記錄殘部退守古寧頭—林厝—湖尾一線；沒有明確「林厝→古寧頭」行軍紀錄 | `SRC-0004`、`SRC-0027` | `EVT-0015`、`EVT-0017`；`TIM-0068`、`TIM-0073` | **MODIFY**（若要保留，改稱「林厝戰鬥→古寧頭會合／建立防線」；若要求實際行軍則移除） |
| R07 | `PARTIALLY_SUPPORTED` | 1949-10-26 12:00–17:00 左右；為事件序列推定的後段，不是已核定 route time | PLA retreat；ROC pursuit／encirclement 不應混成同一 side | PLA 殘部；無單一 canonical Unit ID，可追溯至廣義第一梯隊／增援部隊 | legacy `POI-0006` 古寧頭（北山） | `POI-0021` 北山斷崖；沒有對應 canonical coast Location | Retreat / Displacement；不是已證實的 Advance | `TIM-0089`、`TIM-0090`、`TIM-0093`–`TIM-0095` 描述林厝／南山失守後退至北端海岸；`route_database` 有 `POI-0006→POI-0021` 的 `Retreat Route` 候選，但沒有 provenance | `SRC-0004`、`SRC-0027` | `EVT-0019`、`EVT-0020`；`TIM-0089`、`TIM-0090`、`TIM-0093`、`TIM-0094`、`TIM-0095` | **REMOVE**（與 R11 合併為一條有時間界線的後期退守敘事，不保留「東北海岸」模糊方向） |
| R08 | `PARTIALLY_SUPPORTED` | 1949-10-25 04:30 起；主要地面反攻軸可確認於 1949-10-26 06:00–15:00 | ROC | `U-0003` 第118師、`U-0006` 第14師第42團、`U-0015` 第118師第353團；裝甲單位 mapping 不完整 | route list 的「南側」未被核定；資料明確提到 `POI-0009` 埔頭為攻擊發起點 | `POI-0007` 林厝、`POI-0006` 古寧頭／北山一帶；TLS-0007 另含 `POI-0008` 南山 | Counterattack | `TIM-0053` 記錄三路反擊；`TIM-0080`–`TIM-0081` 明確為「埔頭→林厝、古寧頭」；`EVT-0019` 記錄收復林厝、南山。起點不應寫成泛稱南側，終點需拆分 | `SRC-0004`、`SRC-0006`、`SRC-0008`、`SRC-0010`、`SRC-0011`、`SRC-0018`、`SRC-0027`、`SRC-0029`、`SRC-0032` | `EVT-0002`、`EVT-0004`、`EVT-0017`、`EVT-0019`；`TIM-0053`、`TIM-0080`、`TIM-0081` | **MODIFY**（改起點為 `POI-0009` 埔頭，並拆出林厝／古寧頭／南山的目標；不要繪製單一不分段線） |
| R09 | `PARTIALLY_SUPPORTED` | 1949-10-25–10/26 的反攻時段可確認；東側起點時間不可確認 | ROC | 可追溯 `U-0003`、`U-0015` 的反攻單位；「東側」沒有 unit binding | 東側戰區待核；全域 Timeline 的明確發起點是 `POI-0009` 埔頭，不是東側 | 古寧頭／林厝；沒有單一 endpoint | Counterattack | general counterattack、林厝／古寧頭爭奪有證據，但沒有「東側→古寧頭／林厝」的獨立文字或 route candidate；修正後會與 R08 重疊 | `SRC-0004`、`SRC-0027` | `EVT-0002`、`EVT-0004`、`EVT-0017`、`EVT-0019`；`TIM-0080`、`TIM-0081` | **REMOVE**（先移除東側假定；由 R08 改成一條有證據的埔頭反攻軸） |
| R10 | `NO_EVIDENCE` | 反擊／包圍的大時段可落在 1949-10-26，但本 route 沒有可核定時間 | ROC | `U-0003`／`U-0015` 只能支持廣義反攻，不能支持此 route 的方向 | 東北／東側待核 | 西南頭一帶未定義，沒有 canonical Location | Counterattack / Compression | `TLS-0007`、`TIM-0095` 支持國軍完成包圍；可追溯攻擊軸是埔頭→林厝／古寧頭，並非本表的東北／東側→西南頭方向；方向可能是原圖判讀錯置 | `SRC-0004`、`SRC-0027` | `EVT-0004`、`EVT-0020`；`TIM-0080`、`TIM-0095` | **REMOVE**（待新史料確認前不保留；不可用一般包圍事件替代此方向） |
| R11 | `PARTIALLY_SUPPORTED` | 1949-10-26 12:00–22:00 至 1949-10-27 09:30；需拆成退守與包圍兩種行動 | PLA retreat；ROC encirclement／pursuit | PLA 殘部；ROC 可追溯 `U-0003`／`U-0015`，但不是同一 route side | 古寧頭北端／legacy `POI-0006`；不能直接代換成單一 canonical point | `POI-0021` 北山斷崖；目前沒有 canonical coast Location | Retreat + Pursuit / Encirclement；語義必須拆開 | `TIM-0089`、`TIM-0090`、`TIM-0093`、`TIM-0094`、`TIM-0095`、`TIM-0097` 及終局條目明確描述解放軍被壓縮至北端海岸；`route_database` 同樣只有候選 `POI-0006→POI-0021` | `SRC-0004`、`SRC-0027` | `EVT-0019`、`EVT-0020`、`EVT-0021`、`EVT-0023` | **MODIFY**（保留為單一 PLA 後期退守候選；把 ROC 包圍改成事件／戰線層，不混入同一 LineString） |
| R12 | `NO_EVIDENCE` | 1949-10-27 00:00–16:00 是終局戰鬥時段，但不是本 route 的移動時間 | PLA 殘部／ROC 圍剿；未能選定單一 side | PLA 殘部與 ROC 圍剿部隊均只有廣義資料，沒有 route-specific unit | 戰場中心未定義 | 最終海岸區域未定義；可見資料最多只能指向 `POI-0021` | Final Encirclement / Retreat；未證實為一條移動線 | `EVT-0005`、`EVT-0021`、`EVT-0024` 和 `TIM-0113`–`TIM-0116` 支持北端殲滅、投降與戰役結束，不支持一條新的中心→海岸 route；與 R07／R11 重複 | `SRC-0004`、`SRC-0027` | `EVT-0005`、`EVT-0021`、`EVT-0024` | **REMOVE**（以 R11 的後期退守及終局事件表達即可） |

## 6. 指定重點 Route 的判定

| Route | 判定 |
| --- | --- |
| R03 | 登陸→北山可作 R02＋R01 的敘事摘要，但沒有獨立 route evidence；移除 |
| R05 | `route_database` 只有北山—林厝的道路／POI 關係；不能解讀成 PLA 實際推進；移除 |
| R07 | 有後期退至北端海岸的部分支持，但與 R11 同一敘事段；移除並併入 R11 的修正版 |
| R10 | 全域資料支持包圍，不支持東北／東側→西南頭方向；可能是圖面方向誤讀；移除 |
| R11 | 是 R07／R12 中唯一適合保留為後期退守候選的主幹，但需改成 PLA retreat，ROC encirclement 另作事件／戰線 |
| R12 | 只有終局結果，沒有新的可核定移動；移除 |

## 7. 建議的下一個人工工作邊界

在人工確認新史料前，不建立或批量繪製 R02、R04、R06、R08、R09、R11 的正式 GeoJSON。若要進入下一階段，優先順序是：

1. 由研究者確認 `安岐` 是否真的可作為 1949 部隊 movement 的歷史節點，而不只是現代地理定位點。
2. 針對 R08／R09 以文字戰史或原始戰役圖核定起點；目前資料最明確的地面攻擊軸是 `POI-0009 埔頭 → 林厝／古寧頭`。
3. 將 R11 拆成「PLA 殘部退守」與「ROC 包圍／追擊」兩個不同語義層，不把雙方行動畫成同一條 route。
4. 為每一條要正式匯入的 route 補齊 source ID、event ID、unit ID、時間精度與 public disclaimer，並由人工確認後才寫入 `routes.geojson`。

本稽核完成前，遵守「不進行其餘 Google Earth Route 批量繪製」的限制。
