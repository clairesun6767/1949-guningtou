# Guningtou Coordinate System Contract

## Status

- Audited: 2026-09-13
- Baseline: `a8774e2becb4fa7f998e890bfb14a8b1efaf3372`
- This is a record of the existing runtime contract, not a proposal to change coordinates.

## Canonical input

- Historical and geographic GeoJSON uses WGS84 / `EPSG:4326`.
- Coordinate order is `[longitude, latitude]`; a third altitude value is accepted by the shared type but is not currently used for the visitor terrain projection.
- Canonical source files retain their original WGS84 values. The Three adapter must not mutate or replace them.

## Three.js local tangent plane

Implementation: `src/battle-replay/visualization/adapters/threeAdapter.ts`.

- Origin: `THREE_LOCAL_ORIGIN = [118.275, 24.49]`.
- Earth radius constant: `6,378,137 m`.
- East metres: longitude delta × radians × Earth radius × `cos(origin latitude)`.
- North metres: latitude delta × radians × Earth radius.
- `ThreeScene` and all current Three layers use this same adapter.

Axis mapping in scene code:

```text
east metres  × 0.001 → Three +X
elevation    × 0.001 → Three +Y
north metres × 0.001 → Three -Z
```

There is no runtime rotation, datum shift, or floating-origin rebasing in the current regional extent.

## Terrain grids and UV

| Asset | Bounds (W/S/E/N) | Grid |
| --- | --- | --- |
| `public/terrain/kinmen-xiamen-regional.json` | `117.97 / 24.34 / 118.58 / 24.65` | `196 × 100` |
| `public/terrain/guningtou-local.json` | `118.285 / 24.44 / 118.37 / 24.50` | `320 × 256` |
| `public/terrain/guningtou-local-coverage-mask.json` | `118.285 / 24.44 / 118.37 / 24.50` | `320 × 256` |

Grid interpretation:

- Column 0 is west and the last column is east.
- Row 0 is north and the last row is south.
- Terrain UV is `u = column/(width-1)` and `v = 1 - row/(height-1)`.
- Classification asset metadata uses the same WGS84 bounds as its corresponding scope and is sampled through terrain UV.
- Local ownership is queried from the explicit coverage mask; the current implementation does not use a rectangular bounding-box hole as the ownership authority.

## Camera assumptions

- Perspective camera FOV: 36°.
- Near/far clip: `0.05 / 240` Three world units.
- Visitor camera pitch is constrained to 45° by the current terrain style.
- Camera destinations are defined in `src/battle-replay/visualization/adapters/threeAdapter.ts` as geographic longitude/latitude plus range metres, then projected through the same local adapter.
- OrbitControls maximum distance is 105 world units; the strategic preset is the intended wide view.

## Data-to-render mapping

- Canonical Locations → `toThreePointFeatures` → local tangent point → POI mesh/CSS2D label.
- Movement and historical trace GeoJSON → layer-specific point/line/polygon projection → terrain height sample plus a small presentation offset.
- Roads/cartography → local tangent projection and terrain height sample; they are modern-reference context and not historical unit routes.
- No automatic snap to OSM roads exists in the historical trace path.

## Invariants for V1.1

1. Do not change `THREE_LOCAL_ORIGIN`, scale, axis mapping, grid orientation, or camera geographic destinations casually.
2. Add adapters around this contract if a new engine needs another coordinate representation.
3. Preserve exact canonical WGS84 values in tests.
4. Keep historical-map registration `schematic_only` until a human enables independently identified anchors and records a reviewed transform.
5. Any future route geometry must declare source/provenance/confidence and must not be generated from visual or road proximity alone.

