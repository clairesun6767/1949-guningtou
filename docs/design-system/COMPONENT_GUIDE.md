# Component Guide

## Primitives

- `.museum-container`: centered 1280px layout frame.
- `.museum-reading`: 720–780px historical reading measure.
- `.museum-section`: vertical section rhythm.
- `.museum-kicker`: mono, uppercase/metadata-style section label.
- `.museum-title`, `.museum-deck`: consistent title and introductory copy.
- `.museum-card`, `.museum-panel`, `.museum-paper`: shared surfaces with restrained borders.
- `.museum-meta`, `.museum-meta-grid`, `.museum-label`: dates, locations, coordinates, IDs.
- `.museum-button`, `.museum-link`: action and text-link language.

## Museum components

### MetadataRow

Use for a label/value pair such as date, location, coordinates, source, or archive ID. Keep labels short and values factual.

### SourceCitation

Use for source IDs and provenance. It may be quiet visually, but should remain accessible and link to the source page when a route is available.

### EvidenceCard

Use when a page presents a source or archive record. It displays source type, title, author/institution, date, identifier, and relevance without inventing missing media.

### PersonCard

Use for person index and related people. It shows name, role, unit, category, and evidence level. Portraits are optional because the current dataset does not provide portrait assets.

### EventCard

Use for event summaries outside the interactive timeline. It shows date/time, location, event type, description, and evidence status.

### HistoricImage

Use for aerial and historic visual assets. A caption and source/provenance line are required whenever the data is available. The original image remains accessible through a direct link.

## Accessibility

Components must keep semantic headings, keyboard-visible focus, descriptive labels, and `aria-expanded`/`aria-controls` when state is interactive. Avoid encoding meaning only with color or iconography.
