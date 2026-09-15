# Gate A — Kinmen–Xiamen Regional Terrain Technical Report

## Scope

Gate A validates the isolated 2.0 regional terrain and art-direction prototype at:

- Route: `/1949-guningtou/v2/region/`
- Branch: `feature/2.0-art-region`
- Data source: existing regional DEM, coastline GeoJSON, and cartographic assets only
- Loading boundary: no village, battlefield, route, unit, or battle-event data is loaded

The implementation is intentionally isolated under `v2/` with a thin Astro entry point. The existing V1 battlefield route and canonical data are not modified.

## Runtime architecture

| Layer | Responsibility |
| --- | --- |
| `v2/config/region.ts` | Region bounds, WGS84 reference origin, camera limits, labels, art variants, performance tiers |
| `v2/shared/geo.ts` | Local tangent-plane conversion and bounds clamping |
| `v2/shared/regionDataProvider.ts` | HTTP loading and validation for regional terrain/coastline/classification assets |
| `v2/prototypes/region/RegionScene.ts` | Three.js scene lifecycle, progressive loading, camera, renderer, debug hooks |
| `v2/prototypes/region/RegionTerrain.ts` | DEM mesh, land mask, elevation palette, classification shader, contours, wireframe |
| `v2/prototypes/region/RegionOcean.ts` | Lightweight animated ocean shader with tiered geometry |
| `v2/prototypes/region/RegionAtmosphere.ts` | Sky, fog, lighting, tone mapping, art-direction variants |
| `v2/prototypes/region/RegionLabels.ts` | CSS2D geographic labels with camera-distance fading |
| `v2/app/RegionPrototype.tsx` | Review shell, preset controls, variant controls, debug panel, runtime status |

## Visual acceptance

The browser review confirmed:

1. Hero / Xiamen / Kinmen / Guningtou camera presets move the scene without leaving the configured regional bounds.
2. Neutral, Cinematic Dawn, and Historical Map variants visibly change the palette and atmosphere.
3. Terrain wireframe and ocean shader debug toggles visibly change the renderer output.
4. The responsive shell remains usable at desktop and mobile widths; mobile switches to the LOW performance tier.
5. Enter Battlefield is an explicit placeholder action and does not load WS2 data.

## Browser performance matrix

Values below are the in-app DEV / ART REVIEW telemetry captured after the scene reached `3D READY`.

| Viewport | Tier | Renderer calls | Triangles | Ready signal | Result |
| --- | --- | ---: | ---: | ---: | --- |
| 1920 × 1080 | HIGH | 4 | 13,458 | 264 ms | PASS |
| 1366 × 768 | HIGH | 4 | 13,458 | 333 ms | PASS |
| 1024 × 768 | HIGH | 4 | 13,458 | 359 ms | PASS |
| 390 × 844 | LOW | 4 | 12,306 | 310 ms | PASS |

The terrain source is a 196 × 100 regional grid (19,600 vertices; 6,056 land triangles in the current coastline mask). The DEV panel reports an estimated 16,656 KB GPU texture footprint for the two 2048 × 1041 RGBA classification masks; this is an estimate, not a raw network payload measurement.

## Camera and interaction guardrails

- Perspective camera: 43° FOV, 0.05 near plane, 180 far plane.
- Orbit distance: 11.8–66 world units on desktop; 13.2–58 on mobile.
- Polar angle: 28°–76°.
- Target longitude/latitude is clamped to the regional bounds before conversion.
- Mouse and touch controls are OrbitControls-based: rotate, pan, and dolly; context-menu navigation is suppressed.

## Known limitations and Gate B handoff

- The source DEM remains intentionally coarse for this Gate A prototype; close-range views show the source grid character.
- No battle entities, route paths, village structures, unit markers, historical annotations, or timeline systems are included.
- Classification texture loading has a procedural fallback so the scene can reach reviewable state before optional masks finish loading.
- WS2–WS4 remain reserved placeholders. Gate B should begin only after the art-direction review accepts the regional terrain framing and performance envelope.

## Verification commands

```text
npm run validate:battle-data
npm run test:battle-data
npm run test:v2
npm run typecheck
npm run build
```
