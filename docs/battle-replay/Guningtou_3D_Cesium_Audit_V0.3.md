# Guningtou 3D Cesium Audit V0.3

Date: 2026-08-23  
Scope: dependency, terrain, imagery, licensing, static deployment, bundle impact, WebGL compatibility, and historical-integrity risk.

## Dependency decision

- Added `cesium@1.144.0` as the only geographic renderer dependency.
- Added `vite-plugin-static-copy@4.1.1` as a development/build dependency for Cesium runtime files.
- Did not add `vite-plugin-cesium`, Three.js, a second domain model, or a second layer manager.
- The implementation follows Cesium's official NPM/Vite requirement to publish `Workers`, `ThirdParty`, `Assets`, and `Widgets`: https://cesium.com/learn/cesiumjs-learn/cesiumjs-quickstart/ and https://github.com/CesiumGS/cesium-vite-example

`npm audit` reports one high-severity transitive `nanoid <3.3.18` advisory through the existing `@astrojs/react → Vite → PostCSS` chain. It is not introduced by Cesium and is outside this renderer migration; no broad dependency rewrite was applied.

## Terrain source

Default, token-free static deployment uses Cesium's WGS84 ellipsoid terrain provider. This is a true geocentric geographic surface and WebGL camera space, but it does not claim local elevation reconstruction.

If `PUBLIC_CESIUM_ION_TOKEN` is present at build time, the renderer opts into Cesium World Terrain with vertex normals. Both cases are labelled in the UI as **Modern geographic reference**. Neither is labelled “1949 terrain”.

The default baseline deliberately avoids an undocumented public terrain endpoint or an embedded access token.

## Imagery source

- Geographic reference: Cesium's packaged `NaturalEarthII` TileMapService imagery, desaturated and darkened by the layer controller.
- Modern Reference layer: increases the reference imagery's brightness/saturation only after explicit user activation.
- Historical imagery: `public/aerial-1944.png` remains a floating comparison card labelled `GEOREFERENCE PENDING`; it is never attached to Cesium terrain as an imagery provider.
- No Bing, Google, OSM business/road labels, or runtime imagery server is enabled by default.

## Licensing and credits

- CesiumJS source is Apache-2.0 licensed. The official quickstart states that Cesium learning content and examples are available under Apache 2.0.
- Cesium's credit display remains mounted in a dedicated visible DOM container; attribution is not programmatically removed.
- Packaged Cesium assets are distributed with the installed Cesium package. Any future World Terrain use additionally requires the operator's own Cesium ion account/token and compliance with ion terms.

## Static build

Astro remains `output: static` with base `/1949-guningtou/`. Build output contains:

- `/cesiumStatic/Workers`
- `/cesiumStatic/ThirdParty`
- `/cesiumStatic/Assets`
- `/cesiumStatic/Widgets`

`buildModuleUrl.setBaseUrl('/1949-guningtou/cesiumStatic/')` is set after the dynamic import, preventing base-path loss on GitHub Pages. Development HEAD checks returned HTTP 200 for the Natural Earth tile metadata and a Cesium worker. Production output contains 389 Cesium static files (7,098,040 bytes).

## Bundle impact

Measured from the production build, minified raw sizes before transport compression:

- `HistoricalMapExperience`: 40,069 bytes JavaScript.
- `CesiumHistoricalRenderer` wrapper: 9,182 bytes JavaScript.
- Cesium dynamic chunk: 4,841,547 bytes JavaScript.
- Cesium widget CSS: 23,810 bytes.

The Cesium chunk is loaded only after the map viewport intersects a 160 px preload margin and WebGL/capability checks pass. It is not synchronously included in the initial historical-map chunk.

## WebGL compatibility and fallback

- WebGL2 or WebGL1 capability is checked before requesting Cesium.
- `failIfMajorPerformanceCaveat` asks the browser to reject unsuitable GPU contexts.
- Devices reporting less than 2 GB device memory use Atlas mode.
- Cesium initialization and `scene.renderError` both switch the shared experience to the preserved V0.2 Atlas renderer.
- Atlas remains mounted beneath Cesium until the WebGL renderer reports ready, preventing a blank map.
- Unmount destroys the Viewer, removes the click action and render listener, clears data sources/imagery, and releases the WebGL context.

## Risks

1. The 4.84 MB Cesium chunk remains substantial on low-bandwidth mobile connections despite lazy loading.
2. WGS84 ellipsoid mode provides geographic depth and camera navigation but not local terrain relief. World Terrain requires an operator token and is still modern reference data.
3. Browser GPU/compositor behavior varies. Atlas fallback is therefore a production requirement, not a development convenience.
4. Strategic labels are geographic orientation references; they are not canonical battle features.
5. Historical aerial georeferencing, battle areas, fronts, directions, corridors, and routes remain unavailable and must not be visually synthesized.
