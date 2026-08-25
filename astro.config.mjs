// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// https://astro.build/config
export default defineConfig({
  site: 'https://clairesun6767.github.io',
  base: '/1949-guningtou',
  trailingSlash: 'always',
  output: 'static',

  integrations: [react()],

  vite: {
    plugins: [
      tailwindcss(),
      viteStaticCopy({
        targets: [
          { src: 'node_modules/cesium/Build/Cesium/Workers/**/*', dest: 'cesiumStatic/Workers', rename: { stripBase: 5 } },
          { src: 'node_modules/cesium/Build/Cesium/ThirdParty/**/*', dest: 'cesiumStatic/ThirdParty', rename: { stripBase: 5 } },
          { src: 'node_modules/cesium/Build/Cesium/Assets/**/*', dest: 'cesiumStatic/Assets', rename: { stripBase: 5 } },
          { src: 'node_modules/cesium/Build/Cesium/Widgets/**/*', dest: 'cesiumStatic/Widgets', rename: { stripBase: 5 } },
          // Keep the research workbench's canonical inputs addressable under
          // the same GitHub Pages base path as the source-map image.
          { src: 'data/battles/guningtou-1949/historical-battle-map-traces.geojson', dest: 'map-data', rename: { stripBase: 3 } },
          { src: 'data/battles/guningtou-1949/historical-battle-map-registration.json', dest: 'map-data', rename: { stripBase: 3 } },
          { src: 'data/battles/guningtou-1949/historical-battle-phases.json', dest: 'map-data', rename: { stripBase: 3 } },
          { src: 'data/battles/guningtou-1949/locations.geojson', dest: 'map-data', rename: { stripBase: 3 } },
        ],
      }),
    ],
    // 靜態 JSON import 優化
    build: {
      assetsInlineLimit: 0,
    },
  },
});
