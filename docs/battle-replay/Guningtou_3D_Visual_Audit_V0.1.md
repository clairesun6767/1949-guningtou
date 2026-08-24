# Guningtou_3D_Visual_Audit_V0.1

Audit date: 2026-08-23  
Scope: Battlefield_OS「1949 古寧頭戰役」主要地圖體驗。  
Mode: Phase 0 read-only audit. No verified coordinate, historical route, battle area, event, or camera data was changed while producing this audit.

## 1. Current architecture

- Application shell: Astro 7 static site (`output: static`) with file-based multilingual routes under `src/pages/[lang]/`.
- Client islands: React 19 components mounted with `client:load` or `client:only="react"`.
- Build layer: Astro's Vite pipeline with Tailwind CSS 4.
- Router: Astro file routing with a fixed `/1949-guningtou/` base and `trailingSlash: always`.
- Data access: legacy JSON is imported statically through `src/data/loader.ts`; the BR-1 battle package is loaded separately by the development coordinate editor and validation scripts.
- Production map route: `src/pages/[lang]/map.astro` mounts `src/components/map/BattleMap.tsx`.
- Battlefield_OS route: `src/pages/[lang]/battlefield-os.astro` is currently an informational prototype page, not the working map experience.
- There is no `.openai/hosting.json`; deployment remains the existing Astro static/GitHub Pages configuration.

## 2. Existing map renderer

- Production renderer: Leaflet 1.9 + React-Leaflet dependency, although `BattleMap.tsx`, `LocationExplorer.tsx`, and `MiniMap.tsx` use Leaflet directly.
- Base map: live OpenStreetMap raster tiles.
- Main battle map: flat 2D GIS presentation centered on northwestern Kinmen.
- Existing markers: 25 legacy POIs from `data/poi.json`, not the six canonical manually verified BR-1 Locations.
- Existing route display: four hardcoded coordinate arrays in `BattleMap.tsx` (`LANDING_ROUTES` and `COUNTER_ROUTES`). These lines have no source IDs, event IDs, confidence, or verification state and must not remain in the production visitor layer.
- The current map UI is a header card plus GIS legend over a Leaflet canvas; it does not provide geographic scale transitions, progressive LOD, historical confidence, or research mode.

## 3. Existing terrain renderer

- No Three.js package is installed.
- No CesiumJS package is installed.
- No Three.js or Cesium renderer exists in production code.
- `battlefield-os.astro` mentions “Three.js / CesiumJS” as a proposed technical foundation, but this is descriptive copy rather than implementation.
- `data/terrain_database.json` is available as legacy metadata, but no production component renders a DEM or terrain mesh.
- The two 1944 aerial images exist under `public/`, but BR-1 georeferencing is explicitly incomplete: zero GCPs, pending transform, no verified geographic image bounds.

Conclusion: introducing a factual terrain mesh or georeferenced historical imagery is not currently justified by the available package. The first migration should establish a renderer-neutral geographic experience and use stylized relief/atlas presentation with explicit disclaimers, leaving a clean adapter boundary for a future verified Cesium/Three terrain source.

## 4. Existing POI system

- Legacy production POIs: 25 records in `data/poi.json`; coordinates vary between Exact, Approximate, and Estimated and all are `partially_verified`.
- Canonical BR-1 Locations: six GeoJSON Point features in `data/battles/guningtou-1949/locations.geojson`; all are `manually-verified` and must remain the location SSOT for the new explorer.
- Canonical location properties already preserve confidence, coordinate precision, source refs, verification method, reviewer, date, and notes.
- Existing `LocationExplorer.tsx` provides category filtering, Leaflet fly-to, and detail links, but it is tied to legacy POIs and desktop list layout.
- Location detail pages use legacy POI IDs and `MiniMap`; there is not yet a canonical Location detail route.

## 5. Existing route system

- Canonical `routes.geojson`: zero features.
- Legacy `route_database.json`: topology/research relationships without geometry provenance. The existing adapter correctly preserves them as `TopologicalConnection` and does not promote them into canonical routes.
- The BR-1 route domain model requires explicit human-entered waypoints, source refs, confidence, verification state, and geometry provenance.
- The main production map bypasses this model by drawing hardcoded polylines. This is the highest historical-integrity risk in the existing visual layer.
- `Battlefield_OS_Route_Audit_V0.1.md` concluded that no reviewed R01–R12 route is fully supported. Candidate research material must remain hidden by default.

## 6. Existing camera system

- Main `BattleMap`: Leaflet pan/zoom only; no preset system.
- `LocationExplorer`: one `map.flyTo()` call with a hardcoded zoom and duration.
- `camera-cues.json`: empty canonical array.
- Camera values are currently scattered in component code.
- There is no strategic→Kinmen→Guningtou scale controller, guided tour state, story mode, or reduced-motion camera fallback.

## 7. Existing timeline

- `BattleTimeline.tsx` provides four date tabs and expandable legacy timeline records.
- It is a separate page and does not control map visibility.
- `data/interactive_timeline.json` provides 12 narrative segments, but several are `needs_human_review`.
- Canonical BR-1 events are empty. A new timeline-map engine may expose the three requested dates and existing source-linked summaries, but must not invent missing spatial geometry.

## 8. Existing layer, label, and imagery systems

- No unified Layer Manager exists.
- Leaflet markers and labels are created inline in each component.
- No production confidence legend or geometry-status UI exists.
- Historical imagery appears as a fixed homepage background image, not as a verified geospatial overlay.
- Modern reference tiles load immediately and are inseparable from the battle map.

## 9. Responsive and mobile strategy

- The global stylesheet has breakpoints at 900 px, 720 px, and 640 px.
- Existing map overlays reflow, but the map remains a desktop Leaflet canvas with overlaid cards.
- There is no bottom-sheet POI interaction, compact map navigation mode, touch/scroll conflict management, mobile-specific LOD, or mobile atmosphere reduction.
- Existing `LocationExplorer` collapses to one column, placing its map below the list rather than preserving map-first exploration.

## 10. Reusable components and assets

- `MainLayout.astro`: navigation, multilingual routes, metadata, and museum visual tokens.
- `SectionHeading.astro`, `SourceCitation.astro`, museum cards and metadata primitives.
- `BattleTimeline.tsx`: event ordering and accessible tab patterns; its data logic can inform the map timeline but should not be duplicated verbatim.
- BR-1 types, validators, legacy adapter, GeoJSON round-trip, and coordinate regression tests.
- Canonical `locations.geojson` and its coordinate provenance.
- `public/aerial-1944.png`: useful as non-georeferenced historical imagery inside the Guningtou detail scene, with an explicit status label.
- Existing color tokens: historical gold, geographic blue-gray, combat red, paper and dark museum surfaces.

## 11. Components to deprecate or narrow

- `BattleMap.tsx`: deprecate as the production battle renderer because it exposes unverified hardcoded routes and a conventional GIS visual model.
- `HeroMap.tsx`: retain for the museum homepage only or replace its manually positioned legacy labels with the strategic atlas entry; its labels are not projected from canonical coordinates.
- Leaflet `LocationExplorer.tsx`: retain for the legacy location index until canonical detail routing is available, but do not use it as the new Level 2 POI explorer.
- `MiniMap.tsx`: retain as a modern-reference utility on legacy detail pages; it is not the historical renderer.
- Hardcoded `LANDING_ROUTES` and `COUNTER_ROUTES`: remove from production presentation. They are not preserved as historical research data because they have no provenance; the actual research data remains in `route_database.json` and the external KML audit.

## 12. Data that must be preserved

- All six coordinates and full properties in `locations.geojson`.
- Empty canonical routes, areas, events, camera cues, units, and other BR-1 package files until reviewed data is supplied.
- Legacy timeline, events, people, sources, POIs, route database, terrain metadata, narratives, and multilingual pages.
- BR-1 source and uncertainty semantics.
- Existing website routes, `/1949-guningtou/` base, static output, and multilingual structure.
- 1944 imagery files and their current pending-georeference metadata.

## 13. Migration risks

1. Historical overclaim: visually polished arrows, corridors, or fronts may be mistaken for verified troop movement without explicit confidence and provenance.
2. Coordinate split-brain: legacy POIs and canonical Locations differ; production must not silently mix them.
3. Imagery false precision: the aerial image has no verified transform and cannot be placed as a factual map overlay.
4. Renderer scope: adding Cesium/Three before a verified terrain source would add bundle cost without improving historical accuracy.
5. Static deployment: any renderer must work under the GitHub Pages base path and avoid runtime-only server dependencies.
6. Mobile GPU budget: atmosphere, large textures, and continuous animation require LOD and reduced-motion behavior.
7. Existing dirty worktree: the redesign must preserve current user changes and avoid broad rewrites outside the map scope.
8. Legacy detail links: canonical Location IDs do not yet have dedicated public detail pages.

## 14. Audit decision

The migration will use the existing Astro + React stack and introduce a renderer-neutral Historical Map Experience rather than claim an unavailable Cesium/Three terrain implementation. The production visitor layer will be driven by canonical Locations, a centralized camera preset registry, a minimal Layer Manager, a timeline filter, confidence semantics, and research-only route visibility. A stylized 2.5D atlas surface will provide the requested oblique geographic experience without pretending that unverified DEM, coastline, aerial alignment, or troop routes are precise. The architecture will keep a future geographic renderer adapter boundary so verified terrain can replace the initial visual surface without changing the data contract.

