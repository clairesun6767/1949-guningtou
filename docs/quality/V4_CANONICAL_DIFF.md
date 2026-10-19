# Battlefield V4.0 Canonical Diff

Date: 2026-10-19
Baseline: `d8f98e7b17594cd2191a9f9791a885919b581c21`
Branch: `fix/site-content-quality-v4`

## Inventory snapshot

| Dataset | Baseline | V4 working tree | Result |
| --- | ---: | ---: | --- |
| Canonical persons | 36 | 36 | unchanged |
| Canonical POIs | 25 | 25 | unchanged |
| Canonical events | 30 | 30 | unchanged |
| Timeline entries | 123 | 123 | unchanged |
| Source Registry entries | 55 | 55 | unchanged |
| Promoted historical routes | 0 | 0 | unchanged |

## Protected geometry

The V4 diff contains no changes under the existing battle package geometry, terrain, coastline, or trace inputs. Canonical POI coordinates are unchanged. The historical map remains subject to its existing schematic/research status and the Evidence Gate remains blocked.

The only canonical-data change is the removal of the duplicated Housha long narrative from `data/poi.json` for POI-0004 through POI-0025. Each affected field now carries an explicit source-review note instead of an unrelated historical narrative. No replacement event, coordinate, unit, route, or claim was fabricated.

## Route inventory

No candidate route was promoted. Existing R01–R12 audit records and route provenance remain under the V1.2/V1.3 evidence workflow.

## Page inventory

V4 adds no page route. The current 286-page build is inherited from the pre-V4 route inventory; the difference from the older 279-page V1.2 report predates this V4 content-quality branch.
