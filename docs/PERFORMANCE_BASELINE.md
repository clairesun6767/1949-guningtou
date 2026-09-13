# Guningtou Performance Baseline

## Status

- Baseline date: 2026-09-13
- Commit: `a8774e2becb4fa7f998e890bfb14a8b1efaf3372`
- This first record separates measured build/runtime facts from metrics not yet available through a repeatable harness.

## Build/static baseline

Command: `npm.cmd run build`

- Result: PASS
- Output: Astro static
- Pages: 279
- Dist files: 718
- Dist bytes: 28,301,152 (26.99 MiB)
- JavaScript: 132 files / 7,908,558 bytes
- CSS: 34 files / 235,558 bytes
- Existing warning: some chunks exceed 500 kB after minification

Largest relevant artifacts observed:

| Asset | Bytes |
| --- | ---: |
| `dist/_astro/Cesium.mx9IgVwQ.js` | 4,841,547 |
| `dist/aerial-1944a.png` | 5,384,381 |
| `dist/aerial-1944.png` | 2,526,468 |
| `dist/_astro/ThreeHistoricalTerrainRenderer.B6oOkg_m.js` | 652,194 |
| `dist/map-data/regional-cartography.geojson` | 505,997 |

## Runtime smoke baseline

Test page: local `/1949-guningtou/zh-tw/map/?qa=classification-both`, Codex in-app browser, initial load.

| Metric | Measured value |
| --- | --- |
| Three renderer status | `ready` |
| WebGL canvas count | 1 |
| Render calls | 3 |
| Render triangles | 201,735 |
| Terrain grids | regional `196×100`; local `320×256` |
| Ownership samples | regional 2,695; local 59; no-owner 0; overlap 0 |
| Classification filter | linear |
| Classification anisotropy | 1 |
| Captured console error/warn entries | 0 on initial load |

These values are the renderer's QA-panel snapshot, not a frame-time average.

## Required but not yet available

The following must be measured with a repeatable browser capture harness before the V1.1 acceptance report can claim a performance budget:

| Test | 1920×1080 | 1366×768 | 390×844 |
| --- | --- | --- | --- |
| Average / p1 FPS during 30 s orbit | NOT AVAILABLE | NOT AVAILABLE | NOT AVAILABLE |
| Continuous zoom FPS | NOT AVAILABLE | NOT AVAILABLE | NOT AVAILABLE |
| Middle-pan FPS | NOT AVAILABLE | NOT AVAILABLE | NOT AVAILABLE |
| Strategic → Guningtou transition | NOT AVAILABLE | NOT AVAILABLE | NOT AVAILABLE |
| GPU texture memory | NOT AVAILABLE | NOT AVAILABLE | NOT AVAILABLE |
| CPU heap after repeated transitions | NOT AVAILABLE | NOT AVAILABLE | NOT AVAILABLE |
| Draw calls/triangles per named state | one initial 3-call / 201,735-triangle sample only | NOT AVAILABLE | NOT AVAILABLE |

No FPS or memory value is inferred from screenshot smoothness. Phase 1 must add the measurement method and record device/browser details.

## Performance constraints for implementation

- Keep Three.js lazy-loaded and do not make Cesium part of the default visitor bundle path.
- Keep terrain-solid as a low-layer control sample.
- Do not introduce React state updates per render frame.
- Do not recreate terrain materials, textures, or scene geometry on camera movement.
- Reuse the current texture filtering/ownership stabilization unless a measured regression justifies a change.
- Any new runtime system must be testable without starting WebGL.

