# Gate A.3P.1 browser review screenshots

這個目錄只收可公開提交的 Chrome 1920×1080 實際頁面截圖，不含 rights-unclear aerial pixels。

- 固定鏡位：`ART_REVIEW_KINMEN_XIAMEN_01`
- 固定 query camera：`camera=art-review-kinmen-xiamen-01`
- safe manifest：`manifest.json`
- performance metadata：`performance.json`
- local-only manifest／含 aerial pixels 的畫面：`.local/aerial-poc/screenshots/gate-a3p1/manifest.json`

## Safe matrix

`A01_BASE`、`A03_OCEAN`、`OCEAN_ENHANCED`、`A04_CLOUD`、`A05_CLOUD_SHADOW`、`DAYLIGHT_T0`、`DAWN_T1`、`OCEAN_SHALLOW_DEEP`、`CLOUD_W0`、`CLOUD_W1`、`CLOUD_W2`、`COVERAGE`、`PERFORMANCE_FULL_DAY`、`PERF_P0`、`PERF_P1`。

## Local-only matrix

`A02_AERIAL`、`A06_FULL_DAY`、`A07_FULL_DAWN`、`SOURCE_MAP`、`PERF_P2`、`PERF_P3`、`AERIAL_OPACITY_50/65/80/95`、`RELIEF_LOW/MEDIUM/HIGH`。這些檔案受 `.gitignore` 保護，不得推送到 GitHub。

## Reproduce

```text
node scripts/capture-gate-a3p1-local.mjs
node scripts/benchmark-gate-a3p1-browser.mjs
```
