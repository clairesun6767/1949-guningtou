// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_AERIAL_ROOT = path.join(PROJECT_ROOT, '.local', 'aerial-poc');
const LOCAL_AERIAL_MIME_TYPES = {
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

/**
 * Serve ignored root .local/aerial-poc files only during astro dev. This keeps
 * local rights-unclear pixels usable for the browser benchmark without ever
 * copying them into dist or the GitHub Pages build.
 */
function localAerialPocPlugin() {
  return {
    name: 'gate-a3p-local-aerial-poc',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const requestPath = (request.url ?? '').split('?')[0];
        const marker = '/.local/aerial-poc/';
        const markerIndex = requestPath.indexOf(marker);
        if (markerIndex < 0) return next();
        let relativePath;
        try {
          relativePath = decodeURIComponent(requestPath.slice(markerIndex + marker.length));
        } catch {
          return next();
        }
        if (!relativePath || relativePath.includes('\0')) return next();
        const root = path.resolve(LOCAL_AERIAL_ROOT);
        const filePath = path.resolve(root, relativePath);
        if (filePath !== root && !filePath.startsWith(root + path.sep)) return next();
        fs.stat(filePath, (error, stats) => {
          if (error || !stats.isFile()) return next();
          const contentType = LOCAL_AERIAL_MIME_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
          response.statusCode = 200;
          response.setHeader('Content-Type', contentType);
          response.setHeader('Content-Length', String(stats.size));
          response.setHeader('Cache-Control', 'no-store');
          response.setHeader('X-Gate-A3P-Local', 'true');
          if (request.method === 'HEAD') {
            response.end();
            return;
          }
          fs.createReadStream(filePath).on('error', () => response.destroy()).pipe(response);
        });
      });
    },
  };
}

// https://astro.build/config
export default defineConfig({
  site: 'https://clairesun6767.github.io',
  base: '/1949-guningtou',
  trailingSlash: 'always',
  output: 'static',

  integrations: [react()],

  vite: {
    plugins: [
      localAerialPocPlugin(),
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
