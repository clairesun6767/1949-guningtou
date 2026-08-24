# Digital War Museum Design System v1.0

## Positioning

The site is an evidence-driven digital museum for understanding the 1949 Battle of Guningtou through place, time, people, and sources. The visual system treats historical material as the primary visual language: archival paper, field maps, coordinates, document IDs, measured typography, and quiet space.

It is deliberately not a game HUD, a cyberpunk interface, a generic SaaS dashboard, or a victory poster.

## Foundations

- **Surfaces:** Museum Dark, Archive Paper, Map Surface, Photo Surface, Document Surface, and quiet overlays.
- **Palette:** charcoal black, archive paper, military olive, bronze, dust gray, map blue-gray, and a restrained conflict red.
- **Typography:** serif for historical reading and display; sans-serif for navigation and controls; monospace for dates, coordinates, and archive identifiers.
- **Layout:** a 1280px museum frame, a 720–780px reading measure, and a mobile single-column flow.
- **Spacing:** an 8px rhythm with approved values from 4px to 128px.
- **Edges:** mostly square or lightly rounded 2–8px borders; large radii are reserved for image or special overlays.
- **Motion:** quiet 150–300ms transitions, image reveal, and timeline emphasis; no continuous or decorative motion.

## Content hierarchy

Every historical page should answer, in order:

1. What is this page about?
2. When and where does it belong?
3. What happened or what is being shown?
4. What evidence supports it?
5. What remains uncertain or open to interpretation?

## Shared visual vocabulary

Use `.museum-kicker`, `.museum-title`, `.museum-deck`, `.museum-meta`, `.museum-card`, `.museum-panel`, `.museum-section`, `.museum-reading`, `.museum-button`, and `.museum-link` from `src/styles/global.css` instead of inventing page-specific visual patterns.

The data schema and localization truth source remain unchanged. Components may format data but must not silently rewrite historical claims.

## Responsive behavior

- 375–430px: single column, compact hero, stacked metadata, map legend in a bottom sheet, timeline as a feed.
- 768px: two-column cards and expanded reading width where content allows.
- 1024px: desktop navigation and map side panels become available.
- 1280–1440px: full museum frame with generous margins and 12-column compositions.

## Accessibility and performance

All interactive controls have visible focus states and at least a 44px touch target on mobile. Semantic headings and landmarks are required. Reduced motion is respected. Historic images carry captions and provenance where the data exists. Astro pages remain static; React hydration is limited to the existing map, timeline, location explorer, and search interactions.
