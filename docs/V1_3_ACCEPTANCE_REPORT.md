# Battlefield V1.3 Acceptance Report

Date: 2026-09-13
Branch: `feature/battlefield-engine`
V1.2 baseline: `00c184a172b04e8dec77679d12aa99b012890cd4`

| Requirement | Status | Evidence | Notes |
| --- | --- | --- | --- |
| V1.2 baseline preserved | PASS | Safety Gate and four preservation commands | Branch, V1.2 HEAD, clean tree, and remote matched before changes |
| Research gaps reviewed | PASS | `docs/V1_3_RESEARCH_GAP_REVIEW.md` | All 9 gaps reviewed in P0 → P1 → P2 order; no gap marked CLOSED |
| P0 closure | PASS — CORRECTLY BLOCKED | 5 P0 gaps; 0 closed | No source excerpt, direct unit binding, or route evidence was invented |
| Human review queue | PASS | `human-review-queue.json`, `docs/V1_3_HUMAN_REVIEW_QUEUE.md` | 9 items; no action selected by software |
| Source Registry integrity | PASS | `data/sources.json`, typed adapter | 38 authoritative records; no second editable registry |
| HistoricalClaim integrity | PASS | `historical-claims.json` | 13 source-linked claims retained without evidence upgrade |
| Evidence Matrix V1.3 | PASS | `evidence-matrix.json`, matrix documentation | 5 candidates carry V1.2/V1.3 snapshots, conflicts, gaps, claim IDs, and review refs |
| Historical Evidence Gate | PASS — BLOCKED | `selectFirstQualifiedHistoricalEvent()` | 0 of 5 candidates qualified; every required dimension remains explicit |
| Production Vertical Slice | PASS — NOT ENABLED | `docs/V1_3_BLOCKED_REPORT.md` | No canonical Event/Unit/Route was created; synthetic slice remains test-only |
| Route protection | PASS | V1.2 `route-audit.json` and validator | R01–R12 retained; 0 routes enabled or promoted |
| Canonical geometry protection | PASS | `docs/V1_3_CANONICAL_DIFF.md`, protected diff/hash audit | 6 Locations, 0 Events, 0 Units, 0 Routes; terrain and traces unchanged |
| Validator | PASS | `HistoricalDataValidator` and regression tests | Production-enabled entities require qualified canonical Claim and Source trace |
| Validation | PASS | `npm run validate:battle-data` | 0 package/historical errors; existing 4 calibration warnings remain warnings |
| Tests | PASS | `npm run test:battle-data` | V1.2 baseline 67/67; V1.3 current 71/71 |
| Typecheck | PASS | `npm run typecheck` | 0 errors, 0 warnings, 0 hints |
| Astro build | PASS | `npm run build` | Static output; 279 pages, unchanged from baseline |

## Final decision

```text
Historical Evidence Gate: BLOCKED
Production Historical Vertical Slice: NOT ENABLED
Qualified Candidate count: 0
P0 gaps remaining: 5
Protected geometry: UNCHANGED
```

This is the evidence-safe V1.3 completion state. The next change requires a human-reviewed source decision and must update only the affected Claim, Evidence Matrix, and research-gap records before the Gate is run again.
