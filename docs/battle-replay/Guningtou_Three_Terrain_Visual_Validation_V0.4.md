# Guningtou Three Terrain Visual Validation V0.4

Date: 2026-08-23  
Browser: in-app Chromium against `http://localhost:4321/1949-guningtou/zh-tw/map/`

## Required viewport captures

The browser DOM reported the requested 1440×900 and 390×844 viewports. The in-app screenshot API omits browser scrollbar/chrome pixels, so saved artifacts were placed without scaling on exact-size dark canvases; all site pixels are unmodified.

- [Homepage desktop — 1440×900](screenshots/v0.4/homepage-desktop-1440x900.jpg)
- [Guningtou desktop — 1440×900](screenshots/v0.4/guningtou-desktop-1440x900.jpg)
- [Homepage mobile — 390×844](screenshots/v0.4/homepage-mobile-390x844.jpg)
- [Guningtou mobile — 390×844](screenshots/v0.4/guningtou-mobile-390x844.jpg)

Observed results:

- Three is the initial renderer and reaches `data-status="ready"` with one WebGL canvas.
- Terrain edges are crisp; no post-processing blur is present.
- Land is clipped to geographic shape rather than presented as a rectangular texture.
- The local north coast is readable and the six canonical POI labels are present.
- At 390×844, document horizontal overflow is 0 px; all six label boxes fit within the 390 px viewport after the mobile camera adjustment.
- Timeline and evidence-card behavior are unchanged.

## Camera A/B

- [35° pitch](screenshots/v0.4/camera-pitch-35.jpg)
- [45° pitch](screenshots/v0.4/camera-pitch-45.jpg)
- [55° pitch](screenshots/v0.4/camera-pitch-55.jpg)

Conclusion: 45° is selected. At 35° the coastline depth is strong but the foreground consumes more of the composition; at 55° the scene becomes more map-like and loses miniature depth. 45° keeps the coastline, relief and POI hierarchy legible together.

## Vertical exaggeration A/B

- [1×](screenshots/v0.4/vertical-exaggeration-1x.jpg)
- [2×](screenshots/v0.4/vertical-exaggeration-2x.jpg)
- [3×](screenshots/v0.4/vertical-exaggeration-3x.jpg)
- [4×](screenshots/v0.4/vertical-exaggeration-4x.jpg)

Conclusion: 3× is selected. At 1× and 2× the 68 m local relief is difficult to read at visitor distance. At 4× the relief is clearer but begins to imply more certainty and drama than the modern reference warrants. 3× provides useful visual separation while remaining explicitly disclosed.

## Defect found during pixel review

The first local capture showed dark fragments even though source triangles were valid. The cause was depth writing from a nearly transparent regional LOD overlapping the local LOD. The fix disables depth writes during crossfade and hides the faded mesh below an opacity threshold. A second pixel review confirmed a continuous local surface and clean coastline.

## Final configuration

| Field | V0.4 value |
| --- | --- |
| Primary renderer | Three.js visitor terrain |
| Regional source / resolution | Mapzen SRTM N24E118 / native ~30 m, runtime 196×100 (~317×348 m) |
| Local source / resolution | Same source, runtime 160×112 (~54×60 m) |
| Camera | Perspective, FOV 36°, pitch 45° |
| Vertical exaggeration | 3×, renderer-only |
| Material | Muted vertex-colored `MeshStandardMaterial`, roughness 0.96 |
| Cesium | Preserved as explicit geographic reference renderer |
| Atlas | Preserved as final non-WebGL fallback |
| Historical imagery | 1944 aerial remains georeference pending; not aligned to terrain |

