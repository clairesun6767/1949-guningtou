# 古寧頭 V1.3 Research Gap Review

本次 review 只使用 repository 既有的 `data/`、`docs/` 與已登錄 source IDs 交叉核對。沒有新增外部史料、頁碼摘錄或人工裁決，因此沒有任何 gap 可標記為 `CLOSED`。

Machine-readable source: `data/battles/guningtou-1949/research-gaps.json`
Human decision queue: `data/battles/guningtou-1949/human-review-queue.json`

## Review matrix

| Gap | Priority | Candidate | Missing Dimension | Existing Evidence | Required Evidence | Status | Human Review |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `RG-GUN-0001` | P0 | `EVT-0008` | Location / source citation | `CLM-GUN-0003`–`0005`; `SRC-0006`, `0008`, `0010`, `0011`, `0018`, `0027`, `0029`, `0032` | Page or excerpt that identifies the 10/26 location and supports the recorded time | `PARTIAL` | `HRQ-GUN-0001` |
| `RG-GUN-0002` | P0 | `U-0003` | Unit identity / participation | `CLM-GUN-0006`; legacy unit record has no direct event/source links | Direct unit identity, event participation, and source binding | `PARTIAL` | `HRQ-GUN-0002` |
| `RG-GUN-0005` | P0 | `R08` | Route | `CLM-GUN-0010`; Route Audit R08 and timeline direction context | Source-backed, time-bounded segments from 埔頭 to separately identified targets and units | `PARTIAL` | `HRQ-GUN-0003` |
| `RG-GUN-0007` | P0 | `SOURCE_REGISTRY` | Source traceability | 38 records in authoritative `data/sources.json`; broad pointers only | Verifiable bibliography plus page, section, archive ID, or excerpt reference | `PARTIAL` | `HRQ-GUN-0004` |
| `RG-GUN-0009` | P0 | `CANONICAL_PACKAGE` | Event / Time / Location / Unit | Five candidates remain in the matrix; package event and unit collections are empty | One existing candidate with all four dimensions at least `SUPPORTED` | `BLOCKED` | `HRQ-GUN-0005` |
| `RG-GUN-0004` | P1 | `LOC-GUN-0005` | Historical identity / extent | `CLM-GUN-0013`; legacy `POI-0008` mapping | Source-backed identity, extent, and reviewed mapping to 南山 | `PARTIAL` | `HRQ-GUN-0006` |
| `RG-GUN-0006` | P1 | `R11` | Route side / time boundary | `CLM-GUN-0011`; late-phase timeline context | Separate source chains for PLA retreat and ROC encirclement/pursuit | `PARTIAL` | `HRQ-GUN-0007` |
| `RG-GUN-0008` | P1 | `REG-GUN-NORTH-COAST` | Region | Broad coastal references in `CLM-GUN-0002` and `0009` | Historical boundary description or map plus reviewed region geometry and provenance | `PARTIAL` | `HRQ-GUN-0008` |
| `RG-GUN-0003` | P2 | `LOC-GUN-0003` | Historical node identity | `CLM-GUN-0002` and `0007`; broad legacy context only | Evidence that 安岐 is a 1949 event node rather than a modern reference | `PARTIAL` | `HRQ-GUN-0009` |

## Closure decision

The repository review found no new evidence strong enough to upgrade a claim, bind a legacy unit to a canonical unit, resolve a historical location, or authorize a route geometry. Existing `OPEN` and `BLOCKED` workflow statuses are preserved in `research-gaps.json`; the review status above describes V1.3 disposition without changing historical truth.

V1.3 therefore proceeds to the legal blocked outcome:

```text
Historical Evidence Gate: BLOCKED
Production Historical Vertical Slice: NOT ENABLED
P0 gaps closed: 0
```

No human action is preselected. Reviewers must use the queue's `APPROVE`, `REJECT`, `REQUEST_MORE_EVIDENCE`, or `KEEP_BLOCKED` choices after inspecting the cited material.
