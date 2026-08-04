// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://clairesun6767.github.io',
  base: '/1949-guningtou',
  trailingSlash: 'always',
  output: 'static',

  integrations: [react()],

  vite: {
    plugins: [tailwindcss()],
    // 靜態 JSON import 優化
    build: {
      assetsInlineLimit: 0,
    },
  },
});
