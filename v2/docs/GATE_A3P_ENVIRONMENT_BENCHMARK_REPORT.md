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

判定：REVISE。雲的技術路徑成立，但瀏覽器畫面仍需用固定 camera 進行 W0／W1／W2 的 A/B 對照，確認雲量不會遮住歷史地形文字與古寧頭主景。

## 6. Cloud shadow

地形與海面共用 REGION_CLOUD_DENSITY_GLSL。shadow offset 由 cloud altitude 與 sun direction 計算，垂直 sun component 以 0.12 clamp，結果再限制在 ±80 world units，避免晨曦低角度產生 NaN 或無限投影。

陰影是 soft、large、low-contrast 的 fragment darkening，不建立昂貴 shadow map。terrain 優先；ocean 只使用很輕的相容 darkening。

判定：REVISE。物理關係與有限性測試已通過，但必須用同 camera 的 T0／T1 8 秒畫面確認「雲移動」與「地面對應陰影移動」可被人眼辨識。

## 7. Atmosphere／horizon

RegionAtmosphere 以 sky gradient 與 FogExp2 提供距離透視；遠處降低對比與飽和，近處保留 DEM detail。海面 sphere shell 背景負責填滿視野，不依賴有限 ocean plane。

判定：KEEP。它是目前降低陸地截斷感、維持金廈海域連續視野的必要層。

## 8. Unified Sun

RegionSun 對所有 preset 做向量正規化。RegionAtmosphere 的 DirectionalLight、terrain relief、ocean glint、cloud color 與 cloud shadow offset 都從同一 EnvironmentState 讀取。

判定：PARTIAL。結構上已統一，T0／T1／T2 的 shader 與 light response 已接通；仍需在固定鏡頭完成 daylight／dawn proof，才能升為視覺 PASS。

## 9. 實機初始觀測

Chrome 真實 WebGL 觀測 URL：

http://localhost:4321/1949-guningtou/v2/region/?historical=H4&aerial=local&environment=P3&time=T0&weather=W1&camera=guningtou&debug=open

目前觀測：

- HIGH tier
- 60 FPS
- 5 draw calls
- 944,070 triangles
- 10 textures
- GPU estimate 約 46,792 KB（估算值，不是硬體查詢）
- first meaningful 3D：264 ms
- Gate ready：538 ms
- environment ready：5 ms
- historical texture：512×512、12 tiles、650,525 bytes

這是單次 local POC 觀測，不是長時間性能承諾。P0／P1／P2／P3 的同鏡頭正式截圖與統計會在 benchmark capture script 完成後補入 handoff。

## 10. Environment verdict

- Enhanced Ocean：KEEP
- Cloud：REVISE
- Cloud Shadow：REVISE
- Atmosphere：KEEP
- Unified Sun：PARTIAL
- P3：目前是最完整的實際 browser result，但仍受 rights、正射校正與 cloud proof 限制。
