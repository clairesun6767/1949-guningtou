# Guningtou Continuous World Architecture V0.6

## Decision

The visitor experience uses one Three.js scene and one WGS84-to-local tangent-plane conversion. Regional terrain is never removed when the camera enters Guningtou. The local DEM, local cartography, buildings, POIs, and historical overlays form a nested detail patch in the same world group.

Cesium remains source-controlled as a developer geographic-verification renderer and is loaded only from the development query `?renderer=cesium`. Atlas is an automatic emergency fallback. Neither is exposed in visitor controls.

## Runtime hierarchy

```text
ThreeScene (one local tangent plane)
├── regional terrain (always retained)
├── regional roads + coastline outside local footprint
├── Guningtou detail patch (distance-faded LOD)
│   ├── local DEM terrain
│   ├── local classification masks
│   ├── local roads + one local coastline accent
│   └── building blocks
├── battle movement layer
├── canonical POIs
└── labels
```

Both DEMs and all overlays derive positions through the same `wgs84ToLocalMeters` projection. Canonical WGS84 data remains unchanged.

## LOD policy

- Camera distance greater than 24 world units: regional terrain only.
- Between 24 and 8 units: local terrain/cartography feather in continuously.
- Within 8 units: local detail reaches full opacity.
- Regional terrain opacity remains 1 at every distance. Only regional road/coast geometry touching the local footprint is omitted at build/runtime construction so the local equivalent is the sole accent there.
- OrbitControls retain a 105-unit maximum distance for all presets, allowing manual return from Guningtou to the Kinmen–Xiamen extent.

The local patch has a small stable vertical separation and a 3.5% UV edge feather. It therefore reads as an LOD refinement rather than an opaque rectangular replacement.

## Stable cartographic surface

V0.5 used independent transparent, double-sided, near-coplanar meshes for agriculture, forest, settlement, beach, and open ground. Overlapping OSM polygons, transparent depth writes, and the simultaneous regional/local surface stacks could alternate in the depth buffer.

V0.6 rasterizes those semantic classes at build time into two masks per scope:

| Asset | Resolution | Channels |
| --- | ---: | --- |
| regional-classification-a | 2048×1041 | agriculture / forest / settlement |
| regional-classification-b | 2048×1041 | beach / reserved |
| guningtou-classification-a | 2048×1446 | agriculture / forest / settlement |
| guningtou-classification-b | 2048×1446 | beach / reserved |

The masks are sampled inside the terrain `MeshStandardMaterial`, after vertex elevation color and before lighting. They use `NoColorSpace`, generated mipmaps, trilinear minification, linear magnification, clamp-to-edge wrapping, and anisotropy capped at 8 or the device maximum. Only roads, buildings, a single coastline accent per footprint, POIs, and battle overlays remain geometry.

## Performance intent

This removes hundreds of semantic surface polygon meshes and their transparent materials. V0.5’s reported baseline was approximately 18 draw calls / 144k triangles. V0.6 reduces semantic surface draw calls, while the retained regional/local terrain, classification passes, POIs, labels, and historical movement overlays produce a measured runtime total recorded in the visual validation report.

## Future extension

The material hook can add a separately reviewed historical texture later. Movement features already carry date ranges, so progress interpolation may be added without claiming unsupported hourly precision. No floating-origin split is currently required at this regional extent.
