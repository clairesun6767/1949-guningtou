# Gate A.3P.1 — LOCAL VISUAL TUNING

日期：2026-09-16  
Branch：`feature/2.0-art-region-environment-poc`  
固定鏡位：`ART_REVIEW_KINMEN_XIAMEN_01`  
狀態：`GATE A.3P.1 — READY FOR ART REVIEW`

本報告只涵蓋既有 Gate A.3P Three.js 原型的本機視覺調校與瀏覽器驗證。不新增產品功能，不進 Gate B。最終藝術判定保留給 human／GPT review，本報告不自宣告 PASS。

## 1. Scope and rights boundary

- 1944／1945／1958 Kinmen aerial pixels、Smart Composite 與含其像素的畫面只存在於 `.local/aerial-poc/`，維持 LOCAL ONLY，未加入 Git。
- 公開安全截圖只使用 BASE／現代 DEM、海面、雲、雲影、大氣與 coverage outline；不含 rights-unclear aerial pixels。
- UI 對本機 Smart Composite 顯示 `VISUAL COMPOSITE`，不把畫面說成單一 1949 航照或 verified historical fact。
- Xiamen 八張影像仍只作 `EVIDENCE / GEOREGISTRATION RESEARCH`。`XIAMEN_WWII_AERIAL_UNVERIFIED_01` 的 GCP single-image QA 仍為 BLOCKED，沒有 mosaic／terrain projection。

## 2. Fixed review frame

所有截圖與效能測量使用同一 query camera：

`camera=art-review-kinmen-xiamen-01`

Chrome 1920×1080 實際頁面量測確認：

- browser viewport：1902×928，devicePixelRatio 1
- WebGL canvas：1610×824 CSS／drawing buffer
- camera position：117.957, 24.193
- camera target：118.210, 24.490
- distance：56.0
- 視野包含 Xiamen、Dadeng、Xiaodeng、Kinmen、Guningtou 方向與周邊海域
- shader deterministic seed：固定 shader constants，沒有 runtime random input

本輪另修正 desktop 主視圖高度：side rail 改為獨立滾動，主 WebGL canvas 不再被長側欄拉成 1610×1957。

## 3. Before / after tuning record

| 項目 | 調校前問題 | A3P.1 review parameter／變更 | Review result |
| --- | --- | --- | --- |
| Ocean | 以 legacy sea depth 為主，SHALLOW／INTERMEDIATE／DEEP 不夠可讀 | P1 enhanced ocean；新增 intermediate palette、coastal distance proxy、Fresnel／glint／low-frequency motion | 海面保留 documentary desaturated palette；UI 明示 `ART-DIRECTION COASTAL DEPTH PROXY` |
| Cloud | 可見雲場偏成片，尺度層次不足 | W0 0%；W1 42% preset；W2 68% preset；visible layer 使用 macro／medium／fine deterministic FBM，240×240 cloud card | W0／W1／W2 實際 Chrome 畫面可區分；W1／W2 有大雲塊與中尺度 breakup |
| Cloud shadow | terrain fragment 即使 shadow disabled 也計算完整雲密度 | enabled guard；terrain shadow 改用低頻 two-octave proxy；visible cloud 仍保留完整 FBM | W0／P0 跳過雲影成本；W1／P1、P3 保留低對比同步雲影 |
| Atmosphere | Historical Daylight 讀值偏暗、haze 容易壓住 land／sea depth | T0 exposure 1.28、較低 atmosphere density；hemisphere／ambient 與 post exposure 微調 | land、coast、ocean depth 可讀，haze 仍保留 |
| Aerial presentation | source label 容易被讀成單一年代航照 | local default H7／P3／T0／W1／RELIEF／65%；Smart Composite label 改為 `VISUAL COMPOSITE` | 1944＋1945 primary、1958 fallback、BASE fallback 在 UI 可見 |
| Relief | aerial review 與地形起伏需固定比較 | H6／H7 初始化使用 RELIEF；LOW／MEDIUM／HIGH 以固定鏡位擷取 | 65% 與 RELIEF MEDIUM 作為主要 art review candidate；不宣告 final sign-off |
| Layout | desktop side rail 會撐高主 row，扭曲 WebGL viewport | desktop `.region-main`／`.region-viewport` 固定在 topbar/footer 內，rail 自行 scroll | 1920×1080 canvas 穩定為 1610×824 |

## 4. Screenshot matrix

### 4.1 GitHub-safe screenshots

目錄：`docs/2.0/screenshots/gate-a3p1/`  
manifest：`docs/2.0/screenshots/gate-a3p1/manifest.json`

已產出：

- `A01_BASE.png`、`A03_OCEAN.png`、`OCEAN_ENHANCED.png`
- `A04_CLOUD.png`、`A05_CLOUD_SHADOW.png`
- `DAYLIGHT_T0.png`、`DAWN_T1.png`
- `OCEAN_SHALLOW_DEEP.png`
- `CLOUD_W0.png`、`CLOUD_W1.png`、`CLOUD_W2.png`
- `COVERAGE.png`
- `PERFORMANCE_FULL_DAY.png`、`PERF_P0.png`、`PERF_P1.png`

這些畫面不請求 local aerial pixels，可供 GitHub／GPT 直接檢視。

### 4.2 Local-only screenshots

目錄：`.local/aerial-poc/screenshots/gate-a3p1/`  
manifest：`.local/aerial-poc/screenshots/gate-a3p1/manifest.json`

已產出：

- `A02_AERIAL.png`、`A06_FULL_DAY.png`、`A07_FULL_DAWN.png`
- `SOURCE_MAP.png`
- `PERF_P2.png`、`PERF_P3.png`
- `AERIAL_OPACITY_50.png`、`AERIAL_OPACITY_65.png`、`AERIAL_OPACITY_80.png`、`AERIAL_OPACITY_95.png`
- `RELIEF_LOW.png`、`RELIEF_MEDIUM.png`、`RELIEF_HIGH.png`

這些畫面可能包含 rights-unclear Kinmen aerial pixels，已由 `.gitignore` 排除，不能上傳 GitHub。

### 4.3 Reproduction

```text
npm.cmd exec -- astro dev --background
node scripts/capture-gate-a3p1-local.mjs
node scripts/benchmark-gate-a3p1-browser.mjs
```

截圖腳本固定 Chrome 1920×1080、固定 camera alias 與 deterministic shader constants；含 local asset 的 output 永遠寫入 ignored directory。

## 5. Browser performance benchmark

測量方式：Chrome `headless=new`、wall-clock `requestAnimationFrame`，每組 150 frames、丟棄前 5 frames；不是 virtual-time DOM FPS，也不是 CUA 預覽串流 FPS。Chrome renderer：`ANGLE (NVIDIA, NVIDIA GeForce RTX 5070 Ti, Direct3D11)`。

| Profile | FPS | avg frame | p95 frame | canvas | vertices／triangles | DRAW | GPU estimate | 3D／READY |
| --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: |
| P0 BASE | 60.0 | 16.7 ms | 16.8 ms | 1610×824 | 235,520／469,026 | 4 | 46,792 KB | 430／770 ms |
| P1 Environment | 60.0 | 16.7 ms | 16.8 ms | 1610×824 | 235,520／469,026 | 5 | 46,792 KB | 413／781 ms |
| P2 Aerial／Relief | 60.0 | 16.7 ms | 16.8 ms | 1610×824 | 235,520／469,026 | 4 | 46,792 KB | 425／859 ms |
| P3 Aerial＋Environment | 60.0 | 16.7 ms | 16.8 ms | 1610×824 | 235,520／469,026 | 5 | 46,792 KB | 426／891 ms |

完整 JSON：`docs/2.0/screenshots/gate-a3p1/performance.json`。WebGL GPU frame time 未暴露，因此以實際 rAF／CPU frame 作可重現證據；本機測試機 desktop High 已達到至少 55 FPS 的 review target。

## 6. Review candidate

建議 human／GPT 先檢視：

1. `A06_FULL_DAY`：local-only，H7／P3／T0／W1／RELIEF／65%，確認 Smart Composite 是否仍太亮或需要降低 aerial presentation。
2. `A07_FULL_DAWN`：local-only，與 Daylight 比較 haze、land readability、sea depth。
3. `OCEAN_ENHANCED.png` 與 `OCEAN_SHALLOW_DEEP.png`：確認三段海面深度是「可讀的 art-direction proxy」而不是遊戲化色帶。
4. `CLOUD_W0.png`、`CLOUD_W1.png`、`CLOUD_W2.png`：確認 W1／W2 雲量、邊緣柔化與雲影低對比。
5. `SOURCE_MAP`：local-only，確認 source-year mask 只作 provenance／coverage review。

## 7. Known limitations

- 海面深度不是實測 bathymetry，必須保留 `ART-DIRECTION COASTAL DEPTH PROXY／非真實測深` 揭露。
- Smart Composite 是視覺組合，不是單一年代原始航照，也不能替代 verified historical source。
- Cloud／cloud shadow 是 deterministic procedural proxy，沒有 true volumetric cloud 或 shadow map；本輪優先固定 art direction 與 desktop budget。
- Aerial alignment 仍為 experimental alignment；opacity／relief matrix 是 art review evidence，不是地理配準證明。
- Xiamen archival reverse lookup 與 A-01 registration QA 仍未完成；不可因此建立 Xiamen mosaic 或 terrain projection。
- public screenshot 不含 rights-unclear pixels；要檢視 aerial composite 必須在同一台有 `.local/aerial-poc/` 的本機瀏覽器開啟。

## 8. Gate boundary

本輪只到：`GATE A.3P.1 — READY FOR ART REVIEW`。等待 human／GPT art review；收到 review 前不進 Gate B。
