# 古寧頭 Historical Evidence Matrix — V1.3

本矩陣把「來源存在」與「某個歷史主張被來源支持」分開。矩陣不平均計分，也不使用 `overall` 欄位掩蓋任一必要維度不足。

Machine-readable record: `data/battles/guningtou-1949/evidence-matrix.json`
Claims: `data/battles/guningtou-1949/historical-claims.json`
Sources: `data/sources.json` through the typed Source Registry adapter.
V1.3 review: [`V1_3_RESEARCH_GAP_REVIEW.md`](V1_3_RESEARCH_GAP_REVIEW.md) and [`V1_3_HUMAN_REVIEW_QUEUE.md`](V1_3_HUMAN_REVIEW_QUEUE.md).

Each candidate now carries top-level `claimIds`, `conflicts`, `gapIds`, `v1_2`, `v1_3`, `changeReason`, and `humanDecisionRef` fields. The versioned snapshots make evidence changes auditable; they do not create a score or permit a dimension to be averaged away.

## Vertical Slice Gate

Production historical slice requires:

```text
Event >= SUPPORTED
Time  >= SUPPORTED
Location >= SUPPORTED
Unit >= SUPPORTED
```

If the presentation asserts an exact historical movement path, `Route >= SUPPORTED` is also required. A `PARTIAL`, `DISPUTED`, or `NO_EVIDENCE` dimension blocks that assertion. A static event-context presentation may omit route animation, but it still cannot bypass the Event/Time/Location/Unit requirements.

## Candidate matrix

| Candidate event | Event | Time | Location | Unit | Route | Overall | Gate |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `EVT-0008` 胡璉抵達金門接掌指揮權 | SUPPORTED | SUPPORTED | PARTIAL | PARTIAL | NO_EVIDENCE | PARTIAL | **BLOCKED** |
| `EVT-0001` 解放軍渡海登陸作戰（第一梯隊） | PARTIAL | PARTIAL | PARTIAL | PARTIAL | NO_EVIDENCE | PARTIAL | **BLOCKED** |
| `EVT-0010` 嚨口登陸與殲滅戰 | PARTIAL | PARTIAL | PARTIAL | PARTIAL | NO_EVIDENCE | PARTIAL | **BLOCKED** |
| `EVT-0019` 國軍奪回林厝、南山 | PARTIAL | PARTIAL | PARTIAL | PARTIAL | NO_EVIDENCE | PARTIAL | **BLOCKED** |
| `EVT-0021` 北端崖下殲滅戰 | PARTIAL | PARTIAL | PARTIAL | PARTIAL | NO_EVIDENCE | PARTIAL | **BLOCKED** |

## First candidate decision

V1.3 rechecked `EVT-0008` first because the existing legacy record contains an explicit hour window and is marked `verified`. No repository-only cross-reference supplied the missing page-level citation, canonical Location mapping, or direct unit binding. Its V1.2 and V1.3 snapshots therefore remain `SUPPORTED`, `SUPPORTED`, `PARTIAL`, `PARTIAL`, `NO_EVIDENCE`, with Gate status `BLOCKED`.

## Route policy

The Route Audit contains 12 legacy candidates. The current result is:

```text
SUPPORTED = 0
PARTIALLY_SUPPORTED = 9
NO_EVIDENCE = 3
enabled canonical routes = 0
```

`R08` (埔頭 counterattack direction) and `R11` (late PLA retreat context) remain the highest-priority research candidates, but neither is a canonical LineString. ROC encirclement and PLA retreat must not be merged into one route.

V1.3 does not change the Route Audit or enable any route. An event reaching the Gate in a future review would not automatically qualify a route; route evidence remains an independent dimension.

## Allowed presentation while blocked

Existing visitor presentation may continue to show source-traced schematic graphics, approximate battle movement context, and uncertainty labels under their existing data policies. It must not use the matrix to animate an exact historical route or expose a synthetic unit as a historical unit. The V1.1 synthetic vertical slice remains test-only.
