# UI Architecture

## Existing architecture retained

```text
src/
  components/
    hero/HeroMap.tsx
    map/{BattleMap,LocationExplorer,MiniMap}.tsx
    shared/{SearchBar,LanguageSwitcher}.tsx
    timeline/BattleTimeline.tsx
  data/
    loader.ts
    types.ts
    perspectives/
  i18n/
  layouts/MainLayout.astro
  pages/[lang]/
  styles/global.css
data/
  core JSON truth sources
  prc/ perspective-specific JSON
public/
  historic aerial assets and icons
```

Astro statically generates the three language routes (`zh-tw`, `zh-cn`, `en`). React is hydrated only for existing interactive experiences. GitHub Pages uses `/1949-guningtou/` as the base path.

## Design layers

```text
Design tokens / global primitives
        ↓
Global shell: MainLayout, navigation, footer, search, language routes
        ↓
Museum components: metadata, citation, evidence, person, event, location, historic image
        ↓
Page composition: home, timeline, map, people, archive, research, reflection
        ↓
Existing data loaders and interactive logic
```

The data loader, route structure, map implementation, timeline dataset, and localization dictionary remain the source of truth. The refactor changes composition and presentation around them.

## Component decisions

| Area | Decision |
| --- | --- |
| MainLayout | Refactor: dark museum shell, grouped desktop navigation matching the legacy information architecture, mobile drawer, consistent footer |
| Global CSS | Refactor: semantic tokens, typography, surfaces, responsive primitives, focus/reduced motion |
| HeroMap | Refactor: quieter archival hero and marker treatment; preserve aerial asset and annotations |
| BattleTimeline | Refactor: preserve filtering/expansion; replace visual styling with time rail and evidence panel |
| BattleMap | Refactor: preserve Leaflet/GIS routes and POI markers; add museum map chrome and responsive legend |
| SearchBar | Refactor: preserve client search; use shared form, result, and focus language |
| LanguageSwitcher | Keep and visually align; route-level links remain the canonical language switch |
| HistoricImage, MetadataRow, SourceCitation | Add as focused Astro presentation components |
| Universal renderer | Do not add; page-specific compositions remain clearer and safer |

## Risk register

- Existing copy is mostly hardcoded in page compositions while the UI dictionary is complete mainly for navigation/footer. The refactor leaves historical copy untouched; translation expansion is a separate content task.
- Some pages use root-relative or local-relative dynamic links. Core pages are migrated to `sitePath` so GitHub Pages base routing remains safe.
- The current search index is intentionally lightweight and static; it is not changed into a full-text database.
- The map depends on OpenStreetMap tiles at runtime. The GIS logic and attribution remain intact.
