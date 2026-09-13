# 古寧頭 V1.3 Human Review Queue

The machine-readable queue is [`data/battles/guningtou-1949/human-review-queue.json`](../data/battles/guningtou-1949/human-review-queue.json). It contains nine unresolved review items covering all V1.3 P0–P2 gaps.

Each item records the candidate, dimension, gap, claim IDs, source IDs, current and required evidence levels, known conflict, review question, and the only permitted possible actions:

```text
APPROVE
REJECT
REQUEST_MORE_EVIDENCE
KEEP_BLOCKED
```

No action is selected by the software. A reviewer must decide whether the existing source material closes the exact question, rejects the candidate, requests additional evidence, or keeps the candidate blocked.

## Review order

1. Resolve P0 source citation and candidate dimensions (`HRQ-GUN-0001`–`HRQ-GUN-0005`).
2. Review P1 identity, route-side separation, and region boundary (`HRQ-GUN-0006`–`HRQ-GUN-0008`).
3. Review the P2 historical identity question (`HRQ-GUN-0009`).
4. Only after a human decision, update the relevant Claim and Evidence Matrix row; then rerun the validator and Gate.

The queue is a review artifact, not a second source registry and not a canonical event database.
