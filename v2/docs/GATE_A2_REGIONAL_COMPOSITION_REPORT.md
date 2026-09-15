# 1949 古寧頭 2.0 — Gate A.2 Regional Composition & Infinite Ocean 報告

## 報告範圍與狀態

- Gate：A.2 — Regional Composition & Infinite Ocean
- 審查日期：2026-09-15（Asia/Taipei）
- 分支：`feature/2.0-art-region-composition`
- 基底：`feature/2.0-art-region-quality` / `6636285`
- 原型：`http://localhost:4321/1949-guningtou/v2/region/`
- 預設 review：A.2 composition / B / 1.5× / RELIEF / radial fog 17–38 world units
- 本 Gate 未進入 Gate B、Battlefield、Units、Routes、Timeline 或 Village。

## Previous Bounds

`117.97–118.58 E / 24.34–24.65 N`

這是 Gate A.1 的既有 regional bounds；A.1 的 A/B/C 資產、camera 約束與 benchmark query 保持不變，A.2 以獨立 composition source path 載入。

## New Bounds

`117.84–118.60 E / 24.28–24.72 N`

選定 bounds 的南北、東西跨度為 `0.76° × 0.44°`。runtime target bounds 使用輕微 inset：`117.86–118.58 E / 24.29–24.71 N`，讓預設鏡位保留 composition context 與控制邊界的安全餘裕。

## Why Bounds Changed

A.2 的目標是補足 Kinmen–Xiamen 海域、Xiamen／mainland coastal landmass、Dadeng／Xiaodeng 與 Lieyu／Greater Kinmen 的區域構圖，而不是向東無限制擴張。候選範圍均先以實際 OSM coastline query、實際 DEM tile 覆蓋與瀏覽器鏡位比較驗證。

| Candidate | Bounds | OSM coastline result | 決策 |
| --- | --- | ---: | --- |
| A.1 previous | `117.97–118.58 E / 24.34–24.65 N` | 既有基準 | 保留作 A.1 regression anchor |
| Moderate candidate | `117.90–118.60 E / 24.30–24.70 N` | 35 features / 4,438 points / 109,102 B | Reject：西側與北側 mainland context 仍偏緊，Dadeng／Xiamen shoreline 關係不如 strategic candidate 清楚 |
| Strategic selected | `117.84–118.60 E / 24.28–24.72 N` | 33 features / 4,516 points / 110,412 B | Accept：優先補足 west／northwest／north 與 Kinmen–Xiamen sea space，沒有額外拉大 east water |

`A2_CANDIDATE_MODERATE.png` 與 `A2_CANDIDATE_COMPARISON.png` 是以實際 browser render 製作的候選證據；moderate candidate 的暫存 DEM／OSM 資產沒有留在 runtime，避免混淆最終 provenance。

## DEM Tiles Used

Multi-HGT builder 依 selected bounds 自動計算 required tiles，使用兩張原生 SRTM HGT：

| Tile | URL | Native grid | 約原生解析度 | gzip bytes | raw bytes |
| --- | --- | --- | ---: | ---: | ---: |
| `N24E117` | `https://s3.amazonaws.com/elevation-tiles-prod/skadi/N24/N24E117.hgt.gz` | 3601×3601 | 約 30 m / 1 arc-second | 14,157,689 | 25,934,402 |
| `N24E118` | `https://s3.amazonaws.com/elevation-tiles-prod/skadi/N24/N24E118.hgt.gz` | 3601×3601 | 約 30 m / 1 arc-second | 4,526,292 | 25,934,402 |

建置命令：

```text
node scripts/build-region-quality-terrain-assets.mjs --source-dir C:\Users\user\AppData\Local\Temp\codex-1949-N24E118.hgt.gz --download --bounds 117.84,24.28,118.60,24.72 --grid-b 640x368 --grid-c 1280x736 --coastline-mask 2048x1184 --output-prefix kinmen-xiamen-regional-composition
```

builder 會從 bounds 的 floor tile index 自動取得所有 required tiles，驗證 gzip／raw bytes、square 3601×3601 結構與每張 tile checksum，使用 tile latitude／longitude 正確定位，並在 tile 邊界以跨 tile bilinear sampling 取樣。

## DEM Source Checksums

| Tile | SHA-256 |
| --- | --- |
| `N24E117` | `bc0dbe4058e485036db20879019d5e5dc1705d234dc88168858e0800345a3ae3` |
| `N24E118` | `da8b9d3715046b5158a47075a7212cce45c4b7c788262d78a535519d8b522daa` |

每張 tile 的 URL、checksum、compressed／raw bytes、native grid、latitude／longitude tile identity 都寫入 B/C JSON 的 `source.tiles`；raw HGT 不直接 commit。

## Coastline Coverage

- Source：OpenStreetMap contributors
- Query：Overpass API，`https://overpass-api.de/api/interpreter`
- Copyright／license：`https://www.openstreetmap.org/copyright`
- License：Open Database License（ODbL）1.0
- Acquired：2026-09-15
- Reference era：`modern_reference`
- Selected metadata bounds：`[117.84, 24.28, 118.60, 24.72]`
- Runtime coastline：`public/map-data/regional-composition-coastline.geojson`，33 features / 4,516 vector points / 110,412 B
- Runtime cartography：`public/map-data/regional-composition-cartography.geojson`，880 features / 8,409 geometry points / 544,626 B
- Simplification tolerance：`0.00024°`
- Classification masks：2048×1184，`regional-composition-classification-a.png` 與 `regional-composition-classification-b.png`

為了讓 selected bounds 內的 mainland landmass 在寬景中保持 land／sea separation，OSM open coastline chain 以 `mainland-crop` category 補至 selected bounds；這是 coverage crop closure，不宣稱 bounds 外的完整物理海岸線。

## Terrain Resolution

| Quality | Grid | Samples / vertices | Terrain triangles | Height range | Asset bytes |
| --- | ---: | ---: | ---: | ---: | ---: |
| A.1 A / BASELINE | 196×100 | 19,600 | 6,056 | 既有 asset | 86,295 B |
| A.1 B / BALANCED | 512×256 | 131,072 | 260,610 | 1–395 m | 308,086 B |
| A.1 C / QUALITY | 1024×512 | 524,288 | 1,045,506 | 1–396 m | 1,227,710 B |
| A.2 B / BALANCED | 640×368 | 235,520 | 469,026 | 1–1,044 m | 605,462 B |
| A.2 C / QUALITY | 1280×736 | 942,080 | 1,880,130 | 1–1,045 m | 2,414,211 B |

A.2 B 維持接近 A.1 B 的 geographic sample density（約 840 samples / longitude degree、約 830 samples / latitude degree）；C 為 B 的 2× width／height quality option。B/C 都是從 native HGT direct sampling，不是從 A.1 的 196×100 資產放大。

## Sample Density

新 bounds 擴大到約 `1.25×` 的 longitude width 與 `1.42×` 的 latitude height，因此 B 從 512×256 調整為 640×368，維持近似原有 geographic density；C 從 1024×512 調整為 1280×736，保留 close-up quality option。A.1 資產沒有重建、覆寫或搬移。

## Ocean Plane Removal

原本有限的 `THREE.PlaneGeometry(160,112,...)` 已移除。A.2 ocean 不再是一片可被 rotate／zoom／pan／fly-to 看見邊界的 finite plane；A.1 benchmark path 仍可獨立載入舊資產作回歸比較。

新的 ocean renderer 使用一個 camera-centered `THREE.SphereGeometry` atmospheric shell：

- `renderOrder: -100`
- `frustumCulled: false`
- `depthWrite: false`
- `depthTest: false`
- 一個 shell draw call

這讓 ocean／sky 是輕量的背景氣氛層，而不是有限地表或額外海浪幾何。

## New Ocean

shader 只保留低成本的 `sky / deep / shallow / fog / sun` tone、Fresnel edge response、`sunResponse`、low-frequency motion、subtle glint 與 haze；quality gate 只在 B/C 啟用增強反應。沒有加入 waves physics、SSR、水面反射 pipeline 或高頻 ocean geometry。

區域海面視覺範圍以廈門與金門 review targets 的中點 `118.228, 24.470` 為圓心：半徑 17 world units 內維持清晰，17–38 逐步進入霧化，38 以外讓周邊陸地與海域退入背景霧色。這個徑向 field 以 A.2 quality terrain 的 fragment alpha／fog mix 實現，不新增 geometry 或 draw call。

## Background Strategy

RegionOcean shell 每幀跟隨 camera position，配合既有 scene background、fog、directional light 與 atmosphere treatment，填滿所有 review 方向；A.2 terrain 再以圓心徑向 alpha／fog mix 柔化矩形 DEM 外圍。瀏覽器實測已覆蓋 hero／wide、Xiamen、Kinmen、Guningtou、rotated wide，以及 rotate、zoom、pan、fly-to、reset；沒有看見 finite ocean edge 或明顯陸地截斷。

## Land-Sea Separation

terrain elevation 仍由 DEM height grid 提供；coastline 則是獨立的 OSM vector source，透過 2048×1184 alpha mask 與 polygon discard 保持陸地／海面切分，不把海面誤當成 terrain。A.2 B/C 的徑向 field 只在外圍降低 land fragment alpha 並混入 variant fog color，讓 land／sea 分離與中心島嶼可讀性保持不變。composition classification 另以 2048×1184 masks 提供 agriculture、forest、settlement、beach、open-ground 語意色層；線性資料與建物仍保持 geometry boundary。

## Camera Composition

- Hero target：`118.210, 24.490`
- Hero distance：`56`
- Hero azimuth：`322°`
- Hero polar：`48°`
- target bounds：`117.86–118.58 E / 24.29–24.71 N`
- 保留既有 camera constraints、mouse／touch controls、preset、labels、lighting、variant 與 reset 行為
- A.2 labels 保留 Xiamen、Kinmen、Lieyu、Guningtou，並加入 Dadeng／大嶝（`118.335, 24.549`）以支援區域尺度判讀
- `a2-wide`、`a2-xiamen`、`a2-kinmen`、`a2-guningtou`、`a2-rotated-wide` 可直接重現 review shots

## Performance

### Desktop HIGH target

目標為 60 FPS，stable >=50 FPS 可接受；renderer triangle count 包含 shadow render pass，terrain triangle 另列。以下為實際 running browser readout（1920×1080）：

| Review | FPS | Calls | Renderer TRI | Terrain VTX / TRI | Textures | GPU estimate | Payload | First 3D / Ready |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| A.1 B / 1.5× baseline | 60 | 4 | 522,566 | 131,072 / 260,610 | 9 | 35,206 KB | 410 KB | 約 320 / 328 ms |
| A.2 B / 1.5× | 60 | 4 | 942,022 | 235,520 / 469,026 | 9 | 46,792 KB | 752 KB | 275 / 481 ms |
| A.2 C / 1.5× | 60 | 4 | 3,764,230 | 942,080 / 1,880,130 | 9 | 101,969 KB | 2,518 KB | 324 / 526 ms |
| A.2 B / 1.5× mobile viewport | 60 | 4 | 938,582 | 235,520 / 469,026 | 9 | 46,792 KB | 752 KB | 333 / 465 ms |

A.2 B payload 為 `605,462 + 110,412 + 38,703 + 15,228 = 769,805 B`；C payload 為 `2,414,211 + 110,412 + 38,703 + 15,228 = 2,578,554 B`。GPU estimate 是 runtime bookkeeping proxy，不等同 driver 實際 allocation。draw calls 維持 4，沒有因 A.2 增加；C 僅為 opt-in quality。

## Before-After

所有指定圖像都是實際 Chrome browser capture；A2 screenshots 為 1920×1080，comparison 以相同 review frame 並列：

- [A2_WIDE](../../docs/2.0/screenshots/gate-a2/A2_WIDE.png)
- [A2_XIAMEN](../../docs/2.0/screenshots/gate-a2/A2_XIAMEN.png)
- [A2_KINMEN](../../docs/2.0/screenshots/gate-a2/A2_KINMEN.png)
- [A2_GUNINGTOU](../../docs/2.0/screenshots/gate-a2/A2_GUNINGTOU.png)
- [A2_ROTATED_WIDE](../../docs/2.0/screenshots/gate-a2/A2_ROTATED_WIDE.png)
- [GATE_A2_COMPARISON](../../docs/2.0/screenshots/gate-a2/GATE_A2_COMPARISON.png)：左 A.1 B / 1.5×，右 A.2 final
- [A2_CANDIDATE_COMPARISON](../../docs/2.0/screenshots/gate-a2/A2_CANDIDATE_COMPARISON.png)：左 rejected moderate，右 selected strategic

Before：A.1 使用較窄 bounds 與 finite plane，wide composition 的 mainland／Xiamen context 不足，且 ocean edge 可成為 review 風險。After：A.2 以 selected strategic bounds 補上西北／北側 landmass 與海域，使用 camera-centered atmospheric shell；旋轉、縮放、平移與 fly-to 均維持無可見 ocean boundary。

## Known Limitations

1. DEM 與 OSM 都是 modern geographic reference，不是 1949 historical terrain、shoreline 或 land-use reconstruction。
2. OSM coastline 依 mean-high-water coastline ways；`mainland-crop` 是 selected bounds 的 coverage closure，不是 bounds 外完整海岸線的宣稱。
3. 沒有 bathymetry、sea-floor relief、waves physics 或 SSR；sea space 是 atmospheric tone／haze／glint 層。
4. A.2 C 約 102 MB GPU estimate、2.41 MB terrain JSON，保留為 desktop HIGH／close-up review，不作 mobile default。
5. 徑向霧化是 composition presentation treatment，不是新的物理海岸線或 bathymetry；若極端地把 camera／target 移出 selected composition bounds，仍可能看到 crop coverage 的邊界，正常 review 由 camera constraints 與 presets 控制。
6. browser GPU estimate 與 triangle count 是 instrumentation proxy；不同顯示卡仍需人工 profiling。

## Verification

以下命令已在 A.2 branch 執行：

```text
npm run validate:battle-data
npm run test:battle-data
npm run test:v2
npm run typecheck
npm run build
git diff --check
```

A.1 frozen files `public/terrain/kinmen-xiamen-regional-quality-b.json`、`public/terrain/kinmen-xiamen-regional-quality-c.json`、`public/terrain/kinmen-xiamen-regional.json` 與既有 A.1 screenshot／report 未被 A.2 runtime path 覆寫。

## Recommendation

建議接受 A.2 selected strategic composition，預設使用 B / 1.5× / RELIEF，C 保留為 desktop HIGH close-up／art review 選項。完成 human review 後停止於 Gate A.2，不在本 Gate 預先開啟 Gate B 或其他下游 battlefield scope。
