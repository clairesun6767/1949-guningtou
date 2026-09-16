# Gate A.3P — Cloud Technology Audit

審查日期：2026-09-15（Asia/Taipei）

本 Gate 採自行撰寫的輕量 GLSL，不複製第三方 shader 原始碼。官方範例只作技術方向、成本與授權調查。

## 1. 官方／相容參考

| Project | URL | Owner／license | Technique | GPU／mobile 判斷 | 本專案使用 |
| --- | --- | --- | --- | --- | --- |
| Three.js WebGL Ocean | <https://threejs.org/examples/webgl_shaders_ocean> | Three.js／MIT project | shader-based animated ocean、sun response | 中等；適合研究反射與動畫，仍需按 tier 降級 | 僅採用概念；本專案維持 sphere shell 與自有 shader |
| Three.js WebGPU Volume Cloud | <https://threejs.org/examples/webgpu_volume_cloud> | Three.js／MIT project | volume／raymarch cloud example | 高成本；不作第一版 mobile 路徑 | 不直接使用，避免 AAA volumetric cloud 成本 |
| Three.js repository license | <https://github.com/mrdoob/three.js/blob/dev/LICENSE> | Three.js contributors／MIT | license reference | 不適用 | 記錄 attribution／相容性依據 |
| 本專案 RegionClouds | v2/environment/RegionClouds.ts | 本專案程式 | 2.5D plane、deterministic FBM、world-space wind | LOW 隱藏；MEDIUM／HIGH 一個 cloud draw | 實際採用 |
| 本專案 RegionCloudShadow | v2/environment/RegionCloudShadow.ts | 本專案程式 | 同一 cloud density field 投影到 terrain／ocean | 無 shadow map；低額外 draw，fragment 成本增加 | 實際採用 |

## 2. 第一版 cloud strategy

- 2.5D plane，不做 volume raymarch。
- large-scale noise 形成 clear／thin／dense patches。
- world-space fixed plane，camera rotate／pan 不會讓雲貼在螢幕上。
- windDirection 與 windSpeed 由 EnvironmentState 統一控制。
- W0／W1／W2 只調整 coverage、opacity、shadow strength。
- LOW tier 使用 8×8 cloud plane；保留最低成本的可見大氣提示，避免近距離古寧頭鏡頭因整層隱藏而失去雲層。雲平面會依相機高度調整到鏡頭前方，並使用透明疊加避免被地形深度吞掉。

## 3. Cloud shadow strategy

Cloud density → sun direction → finite projected offset → terrain darkening。

cloud altitude 與 sun direction 都納入 offset；低角度 sun 的垂直分量有下限，offset 有有限範圍。陰影不使用 hard black blob，而是低對比乘法 darkening。Ocean 只保留輕微反應，terrain 是優先消費者。

## 4. 成本假設

- cloud plane：每幀約一個額外 draw call。
- LOW／MEDIUM／HIGH cloud geometry：8／16／32 subdivisions。
- cloud shadow：不增加獨立 shadow map draw call，但 terrain／ocean fragment 會增加 noise evaluation。
- 目前 debug 觀測的 P3 為 5 draw calls；GPU estimate 是應用程式根據 geometry／texture 的估算，不宣稱實際顯卡記憶體。

## 5. Attribution／reuse

本 Gate 沒有把 Three.js 範例程式碼拷入專案；只保留官方連結與 MIT license audit。若未來直接移植第三方 cloud implementation，必須另行記錄 commit、原始檔案、license、修改內容與 attribution，不可用「官方範例」代替授權判定。

## 6. Audit verdict

- 2.5D procedural cloud：KEEP，先以固定鏡頭做 W0／W1／W2 視覺 proof。
- volumetric raymarch：DEFER，不進本 Gate。
- cloud shadow：KEEP as prototype／REVISE proof；若長時間低於 45 FPS，先降低 noise octave 或關閉 ocean shadow。
