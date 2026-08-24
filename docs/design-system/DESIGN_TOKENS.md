# Design Tokens

The canonical tokens live in `src/styles/global.css`. Components should consume these semantic variables or the shared museum classes rather than adding arbitrary hex values.

## Color

| Token | Value | Use |
| --- | --- | --- |
| `--bg-primary` | `#171713` | navigation, hero, dark sections |
| `--bg-secondary` | `#1d1d18` | dark elevated surfaces |
| `--bg-paper` | `#e7e0d1` | reading and archive surfaces |
| `--bg-elevated` | `#f6f2e9` | cards and raised document panels |
| `--text-primary` | `#24241f` | primary reading text |
| `--text-secondary` | `#5f5d54` | supporting text |
| `--text-muted` | `#89877d` | metadata and captions |
| `--border-primary` | `#b7ae9c` | visible structural borders |
| `--border-subtle` | `#d9d0bc` | quiet separators |
| `--accent-primary` | `#a78a5b` | bronze emphasis and selected state |
| `--accent-secondary` | `#72745d` | olive context and map metadata |
| `--historical` | `#a78a5b` | historical/archive semantics |
| `--geographic` | `#687c83` | map and coordinate semantics |
| `--combat` | `#8c4036` | restrained combat alerts and milestones |
| `--archive` | `#d9d0bc` | document and archive surfaces |

Legacy viewpoint variables remain available for compatibility, but new work should use the semantic tokens above.

## Type scale

| Name | Size | Line height | Use |
| --- | --- | --- | --- |
| Display | clamp(2.8rem, 8vw, 7rem) | .92 | hero year and title |
| H1 | clamp(2.1rem, 5vw, 4.5rem) | 1.05 | page or hero title |
| H2 | clamp(1.55rem, 3vw, 2.5rem) | 1.15 | section title |
| H3 | 1.15rem | 1.35 | card or sub-section title |
| Body Large | 1.15rem | 1.8 | introductory reading |
| Body | 1rem | 1.8 | historical prose |
| Body Small | .875rem | 1.65 | supporting copy |
| Caption | .75rem | 1.5 | image/source caption |
| Metadata | .7rem | 1.4 | IDs, coordinates, dates |
| Label | .65rem | 1.3 | uppercase/section labels |

## Spacing, radius, motion

Approved spacing values: `4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96, 128px`.

Approved radii: `2, 4, 6, 8px`. The `16px` radius is for photo or special overlays only.

Motion tokens: `--motion-fast: 150ms`, `--motion-standard: 240ms`, `--motion-slow: 360ms`, all with `cubic-bezier(.22,.61,.36,1)`.
