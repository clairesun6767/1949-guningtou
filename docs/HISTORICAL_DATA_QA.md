# Historical Data QA — V1.2

Date: 2026-09-13
Branch: `feature/battlefield-engine`
Purpose: verify the evidence boundary without changing terrain, canonical Location coordinates, battle movement geometry, or source-trace geometry.

## Data QA

| Check | Result | Notes |
| --- | --- | --- |
| Existing Battle package schema/reference validation | PASS | 0 errors; the package remains `Verified` at the BR-1 structural layer |
| Historical supplemental validation | PASS | 0 errors; 38 source registry entries, 13 claims, 5 matrix rows, 12 route-audit rows, 9 research gaps |
| Source reference integrity | PASS | All supplemental source IDs resolve to the 38-record authoritative `data/sources.json` catalog |
| Route promotion policy | PASS | 12 audit records retained; 0 enabled canonical routes; 0 routes promoted by the adapter |
| Evidence Gate | BLOCKED | 0 of 5 candidates satisfy Event/Time/Location/Unit >= `SUPPORTED` |
| Canonical Location coordinates | UNCHANGED | Existing six `locations.geojson` records were not edited |
| Terrain / classification / movement / source traces | UNCHANGED | No rendering or historical geometry files were edited |

The strongest candidate remains `EVT-0008`; it fails only the historical Gate dimensions of Location and Unit in the current matrix, while the route dimension remains unavailable for any exact movement presentation.

## Engine and product regression

The V1.1 synthetic vertical slice remains the engine regression fixture and is not presented as historical evidence. The existing local Three.js/terrain smoke baseline remains the control sample; V1.2 does not alter the renderer or its asset boundary.

## Commands

```text
npm run validate:battle-data
npm run test:battle-data
npm run typecheck
npm run build
```

Observed verification outcome:

```text
Historical vertical slice: BLOCKED
qualified historical events: none
tests: 67/67
typecheck: 0 errors, 0 warnings, 0 hints
Astro static build: 279 pages
```

Calibration warnings about the existing incomplete imagery/GCP records remain warnings, not V1.2 structural errors. They are intentionally not converted into historical evidence.
