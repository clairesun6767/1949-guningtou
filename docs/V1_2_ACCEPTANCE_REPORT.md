# Battlefield V1.2 Acceptance Report

Date: 2026-09-13
Branch: `feature/battlefield-engine`
Baseline: V1.1 checkpoint `030c5e5` (V1.1 remote checkpoint preserved before V1.2 work)

| Requirement | Status | Evidence | Notes |
| --- | --- | --- | --- |
| V1.1 checkpoint preserved remotely | PASS | `origin/feature/battlefield-engine` | No merge, force push, reset, or destructive history operation |
| Historical inventory produced | PASS | `docs/HISTORICAL_DATA_INVENTORY.md` | Covers POI, Event, Unit, Route, Source, Region, Timeline, Media |
| Formal Source Registry boundary | PASS | `docs/SOURCE_REGISTRY.md`, `src/battle-replay/canonical/sourceRegistry.ts` | Existing `data/sources.json` remains authoritative; no duplicate editable catalog |
| HistoricalClaim model | PASS | `src/battle-replay/canonical/types.ts`, `historical-claims.json` | 13 claims retain source IDs, namespace, evidence level, and notes |
| Evidence Matrix | PASS | `docs/HISTORICAL_EVIDENCE_MATRIX.md`, `evidence-matrix.json` | 5 candidates; dimensions are explicit and not averaged |
| Route Audit migration | PASS | `route-audit.json` | R01–R12 retained; 0 candidate routes enabled or promoted |
| HistoricalDataValidator | PASS | `src/battle-replay/canonical/validator.ts` | Duplicate IDs, references, enums, locale, coordinates/time, enablement, and parent cycles checked |
| Research backlog | PASS | `docs/HISTORICAL_RESEARCH_BACKLOG.md`, `research-gaps.json` | 9 gaps classified P0/P1/P2 |
| Historical Evidence Gate | BLOCKED | `selectFirstQualifiedHistoricalEvent()` | No candidate reaches Event/Time/Location/Unit >= `SUPPORTED` |
| Historical production vertical slice | NOT ENABLED | `docs/VERTICAL_SLICE_REPORT.md` and evidence matrix | Correct outcome under the spec; synthetic slice remains test-only |
| Existing Engine unchanged | PASS | V1.1 runtime tests | No BattlefieldEngine/Timeline/Event/Unit/Camera redesign was needed |
| Existing historical geometry protected | PASS | Git diff and QA | Canonical Locations, terrain, battle movements, and source traces unchanged |
| Validation | PASS | `npm run validate:battle-data` | 0 package errors; 0 historical supplemental errors; existing calibration warnings documented |
| Tests | PASS | `npm run test:battle-data` | Previous 62/62; current 67/67 |
| Typecheck | PASS | `npm run typecheck` | 0 errors, 0 warnings, 0 hints |
| Astro static build | PASS | `npm run build` | Page count must remain documented against the 279-page baseline |

## Decision

V1.2 establishes a usable, auditable canonical-evidence boundary but does not fabricate a production historical slice. The next permitted historical change is a human-reviewed source/claim decision that closes the P0 gaps, followed by a new matrix evaluation and regression run.
