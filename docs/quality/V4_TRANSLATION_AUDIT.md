# V4.0 三語內容翻譯稽核

## Scope

The audit covers the data-backed pages that expose people, locations, events, and the timeline. Presentation copy is kept outside the canonical JSON so that a translation cannot silently become historical source truth. The shared layer is `src/i18n/historicalContent.ts`.

## Current coverage

| Surface | 繁中 | 簡中 | English | Status |
| --- | --- | --- | --- | --- |
| Navigation / footer | Complete | Complete | Complete | PASS |
| Person cards and detail records | Canonical Chinese | Display-layer simplified Chinese | 36/36 authored records | PASS for this surface |
| POI cards and detail records | Canonical Chinese | Display-layer simplified Chinese | 25/25 authored cautious records | PASS for this surface |
| Event analysis | Canonical Chinese | Display-layer simplified Chinese | 30/30 authored titles/descriptions | PASS for this surface |
| Timeline records | Canonical Chinese | Display-layer simplified Chinese | 0/123 editorial translations | BLOCKED |
| Static narrative pages | Existing page-level copy | Mixed; requires page-by-page review | Mixed; requires page-by-page review | PARTIAL |

## Rules applied

- English pages no longer show raw Chinese as if it were English for person, POI, and event records.
- Unresolved English timeline records display a clear pending-translation notice rather than fabricated detail.
- `zh-cn` uses explicit simplified UI copy and a documented display-layer character conversion. This is not treated as independent historical translation and remains subject to editorial review.
- Source quotations and source titles remain identifiable as source material; they are not silently rewritten.

## Remaining human work

1. Commission and review English translations for all 123 timeline entries, including time precision, place names, unit fields, and source notes.
2. Review simplified Chinese terminology for historical unit names and place names against an editorial glossary.
3. Audit the remaining static pages (`context`, `aftermath`, `archive`, `sources`, `postwar`, and related story pages) for page-level copy and SEO metadata.

The site must not be described as fully translated until those items are reviewed. See [`V4_HUMAN_REVIEW_QUEUE.md`](V4_HUMAN_REVIEW_QUEUE.md).
