# 古寧頭 Historical Source Registry — V1.2

## Authority

`data/sources.json` remains the authoritative source catalog during the V1.2 migration. It contains 38 stable `source_id` records. The typed view is produced in memory by `adaptLegacySourceRegistry()`; no second editable source catalog is created.

Migration direction:

```text
data/sources.json (legacy authoritative catalog)
        ↓ explicit adapter
SourceRegistryEntry[] (typed review view)
        ↓ explicit claim citation
HistoricalClaim / Evidence Matrix
```

The source registry records that a source exists and preserves its bibliographic or URL metadata. A registry entry alone is not evidence for a particular historical claim. Claim-level support must be recorded separately with a `HistoricalClaim`, source IDs, and an explicit evidence level.

## Typed mapping

The adapter maps the existing free-text `source_type` vocabulary conservatively to:

| Legacy vocabulary | Registry type |
| --- | --- |
| 官方／政府／國防部 | `OFFICIAL_RECORD` |
| 檔案 | `ARCHIVE` |
| 網站／網 | `WEBSITE` |
| 書／出版 | `BOOK` |
| 地圖／航照／航拍 | `MAP` |
| 照片／影像／油畫 | `PHOTO` |
| 論文／學術／研究 | `RESEARCH` |
| 新聞 | `ARTICLE` |
| 口述 | `ORAL_HISTORY` |
| otherwise | `UNKNOWN` |

The original legacy type is retained in each typed entry's metadata. The adapter does not infer source reliability, resolve conflicting accounts, or upgrade claim confidence.

## Review rules

- Every source reference in a claim or evidence-matrix dimension must resolve to one of the 38 registry IDs.
- A source URL or catalog pointer is not a page-level citation.
- Missing page, excerpt, archive identifier, or direct unit/location binding remains a research gap.
- `SRC-0027` (Wikipedia) is retained as repository evidence context, but is not treated as the sole basis for a `VERIFIED` production claim.
- Source records with `accessible`, `unverified`, `needs_human_review`, or other legacy statuses retain those statuses as metadata; availability is not the same as historical confirmation.

## Implementation

- Typed model and adapter: `src/battle-replay/canonical/types.ts`, `src/battle-replay/canonical/sourceRegistry.ts`
- Runtime validation: `src/battle-replay/canonical/validator.ts`
- Package reference: `data/battles/guningtou-1949/manifest.json` → `sourceCatalog.path = ../../sources.json`
- Research follow-up: [`HISTORICAL_RESEARCH_BACKLOG.md`](HISTORICAL_RESEARCH_BACKLOG.md)
