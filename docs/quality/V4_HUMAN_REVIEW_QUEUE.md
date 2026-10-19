# V4.0 Human Review Queue

Machine-readable queue: [`data/quality/v4-human-review-queue.json`](../../data/quality/v4-human-review-queue.json).

The software does not choose an action. The only permitted decisions are `APPROVE`, `REJECT`, `REQUEST_MORE_EVIDENCE`, and `KEEP_BLOCKED`.

## Priority order

1. Review the five coordinate candidates listed in `V4_POI_COORDINATE_AUDIT.md`, while keeping Huwei Heights and Hunan Heights separate.
2. Supply or review page-level English translations for the 123 timeline records.
3. Resolve source page/excerpt and unit bindings for the V1.3 P0 candidates.
4. Clear person portraits one by one, or keep the neutral placeholder.
5. Obtain legally cleared current images for the military heritage inventory.

Every decision must retain the relevant source IDs, claim IDs, and provenance. A decision must not change canonical geometry or promote a route without a separate Evidence Matrix review.
