# Guningtou Visual Validation V0.6

## Scope

This report records fixed-camera, orbit, zoom, LOD-transition, timeline, and mobile checks for V0.6. Screenshots are stored beside this document in the V0.6 screenshot directory.

## Flicker cause and remediation

| V0.5 stack | V0.6 stack |
| --- | --- |
| Many transparent, double-sided semantic polygon meshes | Two build-time classification masks sampled in the terrain material |
| Settlement floor polygons plus building geometry | Settlement classification in terrain texture; buildings remain geometry |
| Full regional/local semantic stacks cross-faded | Regional linear features are excluded inside the local footprint; local versions progressively enter |
| Duplicate coastline accents possible at local LOD | Regional coastline segments touching the local footprint are omitted; local accent is authoritative |
| Fragile polygon offsets and depth writes | Opaque terrain classification plus mipmaps and anisotropic filtering |

## Manual QA sequence

1. Hold strategic, Kinmen, and local fixed cameras for at least 10 seconds.
2. Slowly orbit the local battlefield.
3. Zoom strategic → Kinmen → Guningtou and manually zoom back out.
4. Inspect local patch edges and coast at transition distances.
5. Inspect roads and building bases at oblique angles.
6. Select 10/25, 10/26, and 10/27 and compare movement state.
7. Repeat strategic and battlefield checks at mobile viewport.

## Acceptance record

Automated results on 2026-08-24:

- battle package quality: `errors=0, warnings=0`; calibration retains four expected no-GCP/georeference-pending warnings;
- movement/classification/continuous-world tests: `44/44` passing tests;
- TypeScript/Astro diagnostics: 0 errors, 0 warnings, 0 hints;
- static build: 275 pages;
- normal map HTML contains no visitor renderer-selector markup and does not reference the 4.84 MB Cesium engine chunk;
- classification masks: regional 2048×1041; local 2048×1446.

Browser visual status: **PASS — local Astro dev server at `http://localhost:4321/1949-guningtou/zh-tw/map/`**.

- stationary desktop hold: pass; no visible classification shimmer, LOD seam, or road/building/coast z-fighting during the fixed-camera observation;
- desktop strategic → Kinmen → Guningtou transition: pass; regional terrain remains present while the local terrain and local coastline progressively take over;
- manual orbit and wheel zoom: pass; wheel zoom-out from the local battlefield reveals the continuous Kinmen context without a renderer switch;
- timeline: pass; 10/25 shows `2 approved`, 10/26 shows `2 approved`, and 10/27 honestly shows `無核定行動幾何`;
- movement readability: pass; 10/25 landing axis and corridor, 10/26 counterattack corridor/axis, and the empty 10/27 state are visible in the corresponding screenshots;
- mobile strategic and mobile battlefield views: pass at 390×844; local battle range uses the V0.6 `1.85×` mobile multiplier so the action remains legible while retaining geographic context;
- layer manager: pass; `戰役行動 4`, `行動走廊 2`, `攻擊方向 2`, and `已確認路徑 —` match the canonical movement package;
- development QA panel: `439,026 TRI · 30 CALLS · DEM 196×100 / 320×256 · OSM R 912 · L 682` on the desktop strategic view. The higher total than the V0.5 approximation is recorded as a V0.6 continuous-world tradeoff, not described as a performance improvement;
- no new browser errors were observed after the Astro dev server was restarted for the current build. Earlier hot-reload dynamic-import errors were from the stale pre-restart session.

Required screenshot evidence:

- `01-strategic-desktop.png` — strategic regional world;
- `02-kinmen-intermediate-desktop.png` — intermediate Kinmen scale;
- `03-guningtou-local-desktop.png` — local terrain and semantic surface;
- `04-guningtou-battle-movement.png` — 10/25 battle movement overlay;
- `05-guningtou-10-25.png` — landing-coast focus and landing axis;
- `06-guningtou-10-26.png` — 10/26 counterattack state;
- `07-guningtou-10-27.png` — honest empty movement state;
- `08-mobile-strategic.png` — 390×844 strategic mobile view;
- `09-mobile-guningtou-battle.png` — 390×844 focused mobile battle view;
- `qa-zoom-out-from-guningtou.png` — manual wheel zoom-out back to the wider Kinmen context.

The V0.5 measured baseline remains approximately 18 draw calls / 144k triangles. V0.6’s measured total is recorded above; the delta reflects the continuous regional/local terrain world plus classification, POI, label, and battle-movement passes. It is not presented as a performance improvement claim.

No GCP or aerial-photo alignment work is part of V0.6. The 1944 image remains labelled `GEOREFERENCE PENDING`.
