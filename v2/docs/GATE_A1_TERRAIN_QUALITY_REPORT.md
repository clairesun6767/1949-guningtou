# Gate A.1 — 3D Terrain Quality Benchmark 報告

## 報告範圍與狀態

- 專案：1949 古寧頭 2.0
- Gate：A.1 — 3D Terrain Quality Benchmark
- 審查日期：2026-09-15（Asia/Taipei）
- 分支：feature/2.0-art-region-quality
- 建議提交訊息：feat(v2): benchmark higher-quality regional terrain
- 原型：http://localhost:4321/1949-guningtou/v2/region/
- Benchmark query：http://localhost:4321/1949-guningtou/v2/region/?benchmark=b-wide-1.5
- 狀態：本報告完成後交由人工審查；Gate B、WS2–WS4、戰鬥資料與 BattlefieldOS 均未啟動。

本 Gate 只處理 Kinmen–Xiamen regional art review prototype 的 A/B/C 地形品質與技術 benchmark。既有 Gate A 視為 A / BASELINE，保留作為回歸基準；新品質資產以 lazy load 方式載入，不改變 A 的既有資料檔。

## Baseline

### A / BASELINE

- 資產：public/terrain/kinmen-xiamen-regional.json
- 網格：196×100，19,600 samples
- 地形三角形：6,056
- 海岸：既有 196×100 grid mask / OSM polygon test
- DEM：既有 Mapzen Terrain Tiles / SRTM N24E118 metadata 與現有 downsample 結果
- Runtime 垂直倍率：A CURRENT 1.72×
- 保留：既有 coastline mask、material、lighting、ocean、camera 與 RegionScene 行為

A 的檔案與既有 Gate A implementation 沒有被重建或替換。A 是基準畫面與 regression anchor；B/C 的改良不回寫 A。

### 固定範圍與 review camera

三個品質層級共用同一 geographic bounds：

117.97–118.58 E / 24.34–24.65 N

固定相機參數為 FOV 43°、near 0.05、far 180。Benchmark preset 位置與目標如下，垂直倍率只改地形 render transform，不改相機：

| Preset | Target | Distance | Azimuth / Polar |
| --- | --- | ---: | --- |
| WIDE | 118.245, 24.490 | 50.0 | 322° / 48° |
| KINMEN | 118.350, 24.450 | 18.0 | 326° / 50° |
| GUNINGTOU MAX | 118.318, 24.478 | 11.8 | 326° / 53° |

Benchmark URLs 使用上述 preset；A/B/C 與垂直倍率測試沒有因品質層級改變相機位置、目標、FOV 或 aspect policy。

## Source Audit

### Audit 結論

- 未把 raw DEM HGT 放進 repository；raw source 僅下載至暫存路徑供建置與 checksum audit。
- A 的現有 196×100 JSON 保持不變。
- B/C 不是 A 的 upsample：兩者都由 native 3601×3601 HGT 直接 bilinear sampling 產生。
- 現有 A 與本次 direct source rebuild 的最大高程不同：A 345m，B 395m，C 396m。這是既有 A snapshot 與本次 source retrieval／processing 結果的已知差異，沒有用 B/C 回填 A。
- DEM 是現代地理高程參考，不是 1949 年歷史地形重建；地圖 coastline 也只作現代 geographic reference。

### Raw source audit

- 暫存檔：C:/Users/user/AppData/Local/Temp/codex-1949-N24E118.hgt.gz
- gzip bytes：4,526,292
- uncompressed bytes：25,934,402
- native HGT：3601×3601×16-bit
- SHA-256：DA8B9D3715046B5158A47075A7212CCE45C4B7C788262D78A535519D8B522DAA
- raw HGT 不提交至 repo；B/C JSON 內嵌 source URL、native grid、取得日期與 checksum。

## DEM Sources

| 欄位 | 紀錄 |
| --- | --- |
| Source | Mapzen Terrain Tiles / SRTM N24E118 |
| HGT URL | https://s3.amazonaws.com/elevation-tiles-prod/skadi/N24/N24E118.hgt.gz |
| Registry | https://registry.opendata.aws/terrain-tiles/ |
| Attribution | Mapzen；SRTM data courtesy of the U.S. Geological Survey |
| Native resolution | 約 30m，1 arc-second，3601×3601 |
| Existing acquisition metadata | 2026-08-23 |
| This benchmark retrieval metadata | 2026-09-15 |
| Temporal scope | modern geographic elevation reference；not a 1949 terrain reconstruction |

建置腳本為 scripts/build-region-quality-terrain-assets.mjs。它解析 native HGT 的 regional bounds，將 elevation 以 metres 保留到輸出，並以 direct bilinear sampling 建立 B/C。verticalExaggeration 不寫入 source DEM；只在 RegionTerrain／RegionQualityTerrain 建立或更新 render positions 與 normals 時套用。

## Coastline Sources

- 資產：public/map-data/regional-coastline.geojson
- Source：OpenStreetMap contributors
- License：Open Database License（ODbL）1.0
- Copyright / license page：https://www.openstreetmap.org/copyright
- Acquisition metadata：2026-08-23
- Metadata bounds：117.95, 24.30, 118.60, 24.70
- Scope：regional strategic context
- Input：mean-high-water coastline ways
- Simplification tolerance：0.00024°
- 統計：32 features、2,608 vector points

A 保留原有 grid mask path。B/C 則將同一份 traceable OSM vector coastline 以獨立 2048×1041 alpha mask rasterize；DEM 網格解析度與 coastline silhouette 解析度分離。B/C shader 以 mask 做 alpha discard 與 coast proximity transition，因此不依賴 512×256 或 1024×512 DEM grid 的方格海岸線。

## Processing Pipeline

1. 以既有文件記錄的 AWS HGT URL 取得 N24E118.hgt.gz，驗證 HGT 尺寸與 SHA-256。
2. 由 native 3601×3601 HGT 直接採樣 regional bounds。
3. B 輸出 512×256；C 輸出 1024×512。兩者均使用 bilinear sampling，不讀取或放大 A 的 196×100 資產。
4. 輸出 JSON 時保留 source、license／attribution、native grid、checksum、processing method、min/max elevation 與 runtime vertical note。
5. RegionQualityTerrain 在瀏覽器內建立 B/C indexed regular grid、CPU normals、slope/aspect/variation attributes 與獨立 OSM coastline CanvasTexture。
6. RegionScene 維持同一 camera、controls、ocean、atmosphere 與 render lifecycle；品質切換只替換 terrain group，並 dispose 被替換的 geometry/material/mask。

沒有加入 fake island、fake elevation、battle route、unit、event、village 或 1949 historical geography。

## A / B / C Quality Details

| Quality | Runtime grid | Vertices | Terrain triangles | Terrain JSON | gzip JSON | Runtime coast |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| A / BASELINE | 196×100 | 19,600 | 6,056 | 86,295 B | 12,180 B | 196×100 grid mask / OSM polygon test |
| B / BALANCED | 512×256 | 131,072 | 260,610 | 308,086 B | 54,357 B | 2048×1041 alpha mask / 2,608 OSM points |
| C / QUALITY | 1024×512 | 524,288 | 1,045,506 | 1,227,710 B | 182,286 B | 2048×1041 alpha mask / 2,608 OSM points |

### B / BALANCED

B 是平衡候選：解析度已明顯高於 A，但仍保持比 C 低的 vertex/index 與 GPU footprint。高度來自 native HGT direct bilinear sampling，沒有以 A interpolation 製造資料。B 使用獨立 OSM coastline mask、smooth CPU normals、elevation vertex color、slope/aspect、low-frequency variation、classification masks、coast proximity 與 subtle contour。

### C / QUALITY

C 是最高畫質選項：1024×512 source-sampled grid，不是 A/B 的單純放大。C 使用與 B 相同的 independent coastline pipeline，但 geometry、normal derivative 與近景 relief detail 更密。C 主要定位為 desktop HIGH 的 visual review／close-up，不作 mobile default。

## Coastline Improvement

A 在 GUNINGTOU MAX 近景仍可觀察到低解析 grid mask 的階梯邊；B/C 使用 2048×1041 的 OSM vector-derived alpha mask，海陸 silhouette 不再由 DEM cell edge 決定。改善同時保留 source traceability，沒有用手工假 coastline 修飾。

瀏覽器證據：

- A：docs/2.0/screenshots/gate-a1/A_WIDE.png
- B：docs/2.0/screenshots/gate-a1/B_GUNINGTOU.png
- C：docs/2.0/screenshots/gate-a1/C_GUNINGTOU.png
- comparison：docs/2.0/screenshots/gate-a1/GATE_A1_COMPARISON.png

## Normals / Material

B/C 的 normals 由實際高程 geometry 計算，不使用 noisy normal map。CPU 建立並傳入：

- elevation-derived vertex color
- slope
- aspect
- deterministic low-frequency variation

shader material 再依 elevation／slope／aspect／variation、兩組既有 classification texture、coast proximity 與 variant 做低幅度調色。Material 採 MeshStandardMaterial，roughness 0.9、metalness 0.015，不以隨機噪聲假造地理形狀。Contours 支援 OFF / SUBTLE / STRONG；art benchmark 預設為 SUBTLE。

## Lighting / Ocean

- CURRENT：沿用 Gate A sun position (-28, 42, 22)、intensity 3.1。
- RELIEF：使用 (-36, 54, 18)、intensity 3.45，拉出山脊與坡面的方向性；B/C 預設此模式。
- Ambient/contact depth：以 ambient light 強度 toggle 與 terrain AO slope/elevation multiplier 提供低成本深度；不引入重型 SSAO pipeline。
- Shadow、fog、tone mapping、labels 與既有 tier controls 保留。
- Ocean 保持輕量 plane shader：原有 wave、distance variation、specular/glint bands 之外，B/C 啟用品質 gated 的 Fresnel edge response 與 sun response；A 的 qualityMode=0，所以 A 輸出不增加該回應。
- Coast transition 使用簡單 mask edge blend；沒有重型海洋模擬。

## Vertical Exaggeration

Debug controls：

1.0× / 1.5× / A CURRENT 1.72× / 2.0× / 2.5×

規則：

- source DEM 高程值維持 metres，沒有修改 B/C JSON。
- 垂直倍率只改 runtime Y positions、max-elevation normalization 與重新計算的 normals。
- 相機 preset、target、FOV、aspect policy 不因倍率改變。
- Benchmark matrix：A CURRENT、B 1.0×/1.5×/2.0×、C 1.0×/1.5×/2.0×。
- 2.5× 保留為人工探索控制，不加入主要比較矩陣，避免無意義組合。

## Visual Benchmark Screenshots

所有檔案由執行中的 Three.js 頁面在 Chrome 1920×1080 擷取。GATE_A1_COMPARISON.png 是將上述 browser screenshots 以 browser HTML layout stitch 後再次由 Chrome 擷取；沒有對 screenshot pixels 做 image retouch、地理後製或 AI image generation。

| Screenshot | Camera / setting |
| --- | --- |
| A_WIDE.png | A / WIDE / 1.72× |
| B_WIDE_1X.png | B / WIDE / 1.0× |
| B_WIDE_1_5X.png | B / WIDE / 1.5× |
| B_WIDE_2X.png | B / WIDE / 2.0× |
| C_WIDE_1X.png | C / WIDE / 1.0× |
| C_WIDE_1_5X.png | C / WIDE / 1.5× |
| C_WIDE_2X.png | C / WIDE / 2.0× |
| B_KINMEN.png | B / KINMEN / 1.5× |
| B_GUNINGTOU.png | B / GUNINGTOU MAX / 1.5× |
| C_KINMEN.png | C / KINMEN / 1.5× |
| C_GUNINGTOU.png | C / GUNINGTOU MAX / 1.5× |

輸出目錄：docs/2.0/screenshots/gate-a1/。

Comparison 圖的固定標籤包含 A / BASELINE、B / BALANCED、C / QUALITY、Resolution、Triangles、FPS 與 Vertical Scale。

## Legacy

Legacy scan 找到可信的既有 V0.4/V0.5 visual references；舊檔沒有修改，僅建立 LEGACY_REFERENCE：

- Primary：docs/battle-replay/screenshots/v0.4/guningtou-desktop-1440x900.jpg
- Comparative before：docs/battle-replay/screenshots/v0.5/before-v0.4-guningtou-desktop-1440x900.jpg
- Comparative after：docs/battle-replay/screenshots/v0.5/after-guningtou-desktop-1440x900.png
- Strategic after：docs/battle-replay/screenshots/v0.5/after-strategic-desktop-1440x900.png

對應 validation docs 為 docs/battle-replay/Guningtou_Three_Terrain_Visual_Validation_V0.4.md 與 docs/battle-replay/Guningtou_Cartographic_Visual_Validation_V0.5.md。

## Performance

### Desktop HIGH target

目標：60 FPS；stable >=50 FPS 可接受；45–49 FPS 為 review；<45 FPS fail。以下是 running Three.js desktop HIGH review readouts（1920×1080，fixed WIDE；renderer triangle count 包含 shadow render pass，terrain triangle 另列）：

| Quality | FPS | Calls | Renderer triangles | Terrain VTX / TRI | Texture count | GPU estimate | Raw payload |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| A | 60 | 4 | 13,458 | 19,600 / 6,056 | 8 | 17,799 KB | 194 KB |
| B | 60 | 4 | 522,566 | 131,072 / 260,610 | 9 | 35,206 KB | 410 KB |
| C | 60 | 4 | 2,092,358 | 524,288 / 1,045,506 | 9 | 65,908 KB | 1,308 KB |

GPU estimate 是 runtime bookkeeping estimate（coast mask texture、vertex attributes、index buffers 等），不是 driver allocation measurement。A 的 first 3D / ready 約 320ms / 328ms；CQA 讀值中的 B/C 也維持 60 FPS。C 的成本顯著高於 B，因此不作 default。

### Performance tiers

HIGH / MEDIUM / LOW 保留。LOW/MEDIUM 可降低 pixel ratio、antialias、shadow、ocean segments、AO／post effect 的成本；不以 coarse coastline 取代 B/C 的 independent coastline mask。C 主要建議在 HIGH 使用，B 為 default candidate。

## Mobile

已用 390×844 viewport 做 smoke test：

- A / LOW tier：60 FPS
- renderer：4 calls、12,306 triangles
- terrain：19,600 VTX / 6,056 TRI
- GPU estimate：17,799 KB
- 結果：無 crash、無水平 clipping、無可見 memory failure

此 smoke test 以 A 為 mobile safety baseline；C 不作 mobile default，未宣稱 mobile C 的完整 benchmark。瀏覽器未提供可直接比較的 GPU memory API，因此 mobile 記錄以 UI GPU estimate 作 proxy，並明確不等同實際顯存分配。

## Verification

- npm run validate:battle-data：完成；technical errors=0，legacy JSON failures=0，既有 calibration warnings=4。
- npm run test:battle-data：71/71 passed。
- npm run test:v2：12/12 passed。
- npm run typecheck：0 errors、0 warnings、0 hints（146 files）。
- npm run build：完成，280 pages built；僅保留既有 Vite chunk >500 KB warning。
- git diff --check：通過；僅有 Git 的 LF/CRLF normalization notice。

## Known Limitations

1. A 現有 snapshot 的 max elevation 345m 與本次 direct native source 的 B/C 395–396m 不同；這是已記錄的 source snapshot limitation，A 保持不變。
2. Mapzen/SRTM 與 OSM 都是 modern reference，不代表 1949 historical terrain、shoreline 或 land use。
3. raw HGT 沒有 commit；可由 JSON provenance、URL、native grid 與 SHA-256 重建／核驗。
4. C 的 geometry 與 GPU estimate 約為 B 的兩倍以上；C 應限制於 desktop HIGH／close-up review。
5. OSM coastline 使用既有 acquisition date 與 simplification tolerance；不是 cadastral survey，也沒有宣稱歷史海岸線精度。
6. GPU estimate 與 renderer triangle count 是 benchmark instrumentation，不取代不同顯示卡的實測 profiling。
7. mobile 只完成 A smoke safety；B/C mobile quality/performance 不在本 Gate 的推薦承諾內。

## Recommendation

**RECOMMEND B（C opt-in）**。

- **B / BALANCED**：作為預設 quality candidate。它保留 native-source DEM 的 traceability，coastline silhouette 明顯優於 A，relief／material 可讀性足夠，payload 與 GPU 成本仍合理，且 desktop HIGH benchmark 達 60 FPS。
- **C / QUALITY**：保留為 HIGH tier 的視覺審查與 KINMEN／GUNINGTOU close-up 選項；畫質最高，但約 65.9 MB GPU estimate、1.23 MB raw terrain JSON，不適合 default 或 mobile。
- **A / BASELINE**：永久保留作 Gate A regression anchor 與低成本 fallback，不因 B/C 成果刪除或替換。

## Reproducibility / Commands

~~~powershell
$env:REGION_HGT_SOURCE = 'C:/path/to/N24E118.hgt.gz'
npm run build:region-quality-terrain
npm run benchmark:gate-a1
~~~

完整 regression：

~~~powershell
npm run validate:battle-data
npm run test:battle-data
npm run test:v2
npm run typecheck
npm run build
~~~

本 Gate 的完成條件是 branch、report、assets、browser screenshots、comparison 與 regression evidence 可供人工 review；完成後停止，不進入 Gate B。
