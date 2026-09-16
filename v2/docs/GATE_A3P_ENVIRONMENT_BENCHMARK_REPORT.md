# Gate A.3P — Regional Environment Benchmark Report

審查日期：2026-09-15（Asia/Taipei）

## 1. 實作範圍

環境系統由 RegionEnvironmentSystem 統一管理：

- RegionSun：單一 normalized sun direction、color、intensity、exposure。
- RegionOcean：SphereGeometry atmospheric sea shell，沒有有限平面邊緣。
- RegionClouds：低成本 2.5D world-space procedural cloud plane。
- RegionCloudShadow：雲密度函數與有限投影偏移。
- RegionAtmosphere：sky gradient、FogExp2、遠距離降低對比與飽和度。

所有 effect 都透過同一個 EnvironmentState 更新，避免 Sun、Ocean、Cloud、Shadow、Atmosphere 各自漂移。

## 2. Benchmark mode

| 模式 | 航照 | environment | 目的 |
| --- | --- | --- | --- |
| P0 | OFF | OFF | A.3 baseline |
| P1 | OFF | ON | 增強海面、雲、雲影、大氣 |
| P2 | SMART／single aerial | OFF | 歷史來源 × DEM |
| P3 | SMART aerial + relief | ON | 完整 A.3P browser benchmark |

歷史模式 H0–H7 已映射到 P0–P3，並支援 1944、1945、1958 single、smart、relief 與 environment。

## 3. Weather／time

Weather：

- W0 晴朗：coverage 0、opacity 0、cloud shadow 0。
- W1 薄雲：coverage 0.42、opacity 0.46、shadow 0.12。
- W2 多雲：coverage 0.68、opacity 0.58、shadow 0.20。

Time：

- T0 歷史日光：明亮、略暖、低飽和。
- T1 戰地晨曦：較低 sun angle、長陰影、暖色。
- T2 航照檔案：較平的檔案色調與較低雲量。

Time 改變時，sun direction、sun color、exposure、atmosphere density、cloud altitude、wind speed 與 cloud-shadow offset 一起更新。

## 4. Ocean

Ocean 使用 radius 150 的 SphereGeometry BackSide shell，depthWrite=false、depthTest=false，保留連續 horizon impression。Enhanced 模式增加：

- low-frequency water motion
- coastal transition／shallow depth impression
- fresnel response
- sun glint
- atmospheric horizon blending
- low-contrast cloud shadow response

判定：KEEP，但仍是藝術方向原型，不是 bathymetry-driven physical ocean。下一 Gate 前應以合法 bathymetry mask 或經確認的 coastal-depth source 取代目前的 procedural depth proxy。

## 5. Clouds

Cloud layer 使用固定 world-space 190×190 plane，coverage 由 large-scale FBM／noise 控制，不跟著 camera position 平移。Timestep 由 renderer clock 驅動，5–10 秒可觀察到慢速 wind motion；W0 會完全隱藏。

LOW tier 不顯示雲層；MEDIUM／HIGH 使用相同 deterministic field，差別在幾何與材質成本。沒有使用 AI 生成、inpainting、super-resolution 或 colorization。

判定：BENCHMARKED／REVIEW。固定 camera 的 Cloud T0／T1 actual Chrome 截圖已完成；W0／W1／W2 控制仍保留為藝術 QA 旋鈕，雲層不被當成資料來源。

## 6. Cloud shadow

地形與海面共用 REGION_CLOUD_DENSITY_GLSL。shadow offset 由 cloud altitude 與 sun direction 計算，垂直 sun component 以 0.12 clamp，結果再限制在 ±80 world units，避免晨曦低角度產生 NaN 或無限投影。

陰影是 soft、large、low-contrast 的 fragment darkening，不建立昂貴 shadow map。terrain 優先；ocean 只使用很輕的相容 darkening。

判定：BENCHMARKED／REVIEW。Cloud T0／T1 在同一組環境控制與 camera 下均已擷取；雲影使用共享密度函數與有限 offset，沒有引入昂貴 shadow map。

## 7. Atmosphere／horizon

RegionAtmosphere 以 sky gradient 與 FogExp2 提供距離透視；遠處降低對比與飽和，近處保留 DEM detail。海面 sphere shell 背景負責填滿視野，不依賴有限 ocean plane。

判定：KEEP。它是目前降低陸地截斷感、維持金廈海域連續視野的必要層。

## 8. Unified Sun

RegionSun 對所有 preset 做向量正規化。RegionAtmosphere 的 DirectionalLight、terrain relief、ocean glint、cloud color 與 cloud shadow offset 都從同一 EnvironmentState 讀取。

判定：BENCHMARKED／PARTIAL ART SIGN-OFF。結構上已統一，T0／T1／T2 的 shader 與 light response 已接通；Daylight T0／Dawn T1 actual browser proof 已提交，最後藝術定稿仍留在 Gate A.3P review。

## 9. 實機初始觀測

Chrome 真實 WebGL 觀測 URL：

http://localhost:4321/1949-guningtou/v2/region/?historical=H4&aerial=local&environment=P3&time=T0&weather=W1&camera=guningtou&debug=open

最終 actual browser 觀測：

- HIGH tier
- 60 FPS
- 5 draw calls
- 944,070 triangles
- 10 textures
- GPU estimate 約 46,792 KB（估算值，不是硬體查詢）
- CPU frame：約 16.7 ms（GPU frame 未由 WebGL 暴露）
- first meaningful 3D：294 ms
- Gate ready：583 ms
- environment ready：6 ms
- historical texture：512×512、12 tiles、650,525 bytes

另外，實際 debug panel 在同一頁顯示 235,520 vertices、469,026 triangles、5 draw calls、10 materials、GPU estimate 46,792 KB、asset payload 752 KB、1944 13.21%／1945 52.99%／1958 11.01%／BASE 22.79%。這些是單次本機 WebGL POC 觀測，不是長時間性能承諾。

## 9A. 實際 browser screenshots

2026-09-15 由 Chrome headless actual page output 重新擷取。可公開安全截圖位於 docs/2.0/screenshots/gate-a3p/：

- P0：A3P_P0_BASELINE.png
- P1／environment：A3P_P1_ENVIRONMENT.png、A3P_P1_DEBUG.png
- P1／Ocean before-after：A3P_OCEAN_BASELINE.png、A3P_OCEAN_ENHANCED.png
- Daylight／Dawn：A3P_DAYLIGHT_T0.png、A3P_DAWN_T1.png
- Coverage：A3P_COVERAGE_MASK.png
- FPS／performance：A3P_PERFORMANCE_DEBUG.png

含 local Kinmen aerial pixels 的 P2、P3、1944、1945、1958、Smart Composite、source map、Cloud T0、Cloud T1 截圖全部位於 .local/aerial-poc/screenshots/gate-a3p/，保持 LOCAL ONLY；兩份 manifest 記錄 query、privacy 與 byte size。廈門 rights-unclear pixels 不進入任何公開 screenshot。

## 10. Environment verdict

- Enhanced Ocean：KEEP
- Cloud：BENCHMARKED／REVIEW
- Cloud Shadow：BENCHMARKED／REVIEW
- Atmosphere：KEEP
- Unified Sun：BENCHMARKED／PARTIAL ART SIGN-OFF
- P0/P1/P2/P3：actual browser benchmark 已完成；P2/P3 的 aerial pixels 只在 local-only route，仍受 rights 與正射校正限制。

## 11. Gate A.3P.1 local visual tuning

2026-09-16 以固定 `ART_REVIEW_KINMEN_XIAMEN_01` 完成同鏡位視覺調校與 Chrome wall-clock rAF benchmark：

| Profile | FPS | CPU frame | p95 | DRAW | READY |
| --- | ---: | ---: | ---: | ---: | ---: |
| P0 | 60.0 | 16.7 ms | 16.8 ms | 4 | 770 ms |
| P1 | 60.0 | 16.7 ms | 16.8 ms | 5 | 781 ms |
| P2 | 60.0 | 16.7 ms | 16.8 ms | 4 | 859 ms |
| P3 | 60.0 | 16.7 ms | 16.8 ms | 5 | 891 ms |

本輪的 visible cloud 使用 deterministic macro／medium／fine FBM；terrain cloud shadow 使用 enabled guard 加低頻 two-octave proxy，避免 W0／P0 為關閉狀態時仍計算完整雲影。Ocean 新增 intermediate palette 與 coastal distance proxy，並在 UI 揭露 `ART-DIRECTION COASTAL DEPTH PROXY`。完整參數、before／after、截圖與限制見 `v2/docs/GATE_A3P1_VISUAL_TUNING_REPORT.md`。

狀態：`GATE A.3P.1 — READY FOR ART REVIEW`。不進 Gate B。

## 11. Gate A.3P.1 local visual tuning

2026-09-16 以固定 `ART_REVIEW_KINMEN_XIAMEN_01` 完成同鏡位視覺調校與 Chrome wall-clock rAF benchmark：

| Profile | FPS | CPU frame | p95 | DRAW | READY |
| --- | ---: | ---: | ---: | ---: | ---: |
| P0 | 60.0 | 16.7 ms | 16.8 ms | 4 | 785 ms |
| P1 | 60.0 | 16.7 ms | 16.8 ms | 5 | 813 ms |
| P2 | 60.0 | 16.7 ms | 16.9 ms | 4 | 916 ms |
| P3 | 60.0 | 16.7 ms | 16.8 ms | 5 | 886 ms |

本輪的 visible cloud 使用 deterministic macro／medium／fine FBM；terrain cloud shadow 使用 enabled guard 加低頻 two-octave proxy，避免 W0／P0 為關閉狀態時仍計算完整雲影。Ocean 新增 intermediate palette 與 coastal distance proxy，並在 UI 揭露 `ART-DIRECTION COASTAL DEPTH PROXY`。完整參數、before／after、截圖與限制見 `v2/docs/GATE_A3P1_VISUAL_TUNING_REPORT.md`。

狀態：`GATE A.3P.1 — READY FOR ART REVIEW`。不進 Gate B。
