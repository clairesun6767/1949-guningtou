# UI / UX Gap Report

## Critical

- Desktop-only hover dropdowns provided no reliable mobile navigation.
- Map and timeline were usable but visually separated from the rest of the site and had no shared evidence/metadata language.
- Dynamic detail links on some pages bypassed the GitHub Pages base path.
- Focus and reduced-motion behavior were not defined globally.

## High

- The white, rounded-card visual language read as a generic content portal rather than a museum/archive.
- Hero content relied on a full-screen visual and delayed animation without enough structured metadata.
- Page titles and reading widths were inconsistent; historical prose was often presented in short sans-serif card blocks.
- Navigation exposed too many items at once and did not clearly separate understanding, battlefield, people, research, and reflection.

## Medium

- Evidence badges used bright status colors rather than the muted archive palette.
- Metadata patterns were repeated ad hoc across person, location, source, and event pages.
- Emoji were used as primary section iconography on several pages, which weakened the archival tone and did not scale across languages.
- Search result styling and loading behavior were not aligned with the site shell.

## Low

- Some secondary pages still have hardcoded Traditional Chinese copy on the English route.
- Archive categories marked as planned do not yet have media assets or document records to display.
- Page-level visual migration can continue for lower-priority pages after the shared shell is stable.

## Migration priority

1. Tokens and global accessibility foundations.
2. MainLayout, navigation, footer, and route-safe links.
3. Home, timeline, map, archive, people, locations, and sources.
4. Secondary information pages and remaining legacy utility classes.
