import { defineConfig } from '@playwright/test';
import path from 'node:path';

const previewUrl = process.env.PREVIEW_BASE_URL?.replace(/\/+$/, '');
const localPort = process.env.PREVIEW_LOCAL_PORT ?? '4321';
const localUrl = `http://127.0.0.1:${localPort}`;
const browserChannel = process.env.PLAYWRIGHT_BROWSER_CHANNEL;
const artifactRoot = path.resolve(process.env.VISUAL_ARTIFACT_DIR ?? 'artifacts/visual-acceptance');

if (process.env.CI && !previewUrl) {
  throw new Error(
    'PREVIEW_BASE_URL is required in CI. Configure the independent remote preview before running visual acceptance.',
  );
}

export default defineConfig({
  testDir: './tests/visual',
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR ?? path.join(artifactRoot, 'test-results'),
  timeout: 60_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: process.env.CI ? 1 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: path.join(artifactRoot, 'playwright-report'), open: 'never' }],
    ['json', { outputFile: path.join(artifactRoot, 'results.json') }],
  ],
  use: {
    baseURL: previewUrl ?? localUrl,
    ...(browserChannel ? { channel: browserChannel } : {}),
    colorScheme: 'dark',
    ignoreHTTPSErrors: false,
    navigationTimeout: 45_000,
    actionTimeout: 15_000,
    trace: 'retain-on-failure',
    screenshot: 'off',
    video: 'off',
  },
  projects: [
    {
      name: 'desktop-1440x900',
      use: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
    },
    {
      name: 'tablet-768x1024',
      use: { viewport: { width: 768, height: 1024 }, deviceScaleFactor: 1, hasTouch: true },
    },
    {
      name: 'mobile-390x844',
      use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
    },
  ],
  webServer: previewUrl
    ? undefined
    : {
        command: `npm run preview -- --host 127.0.0.1 --port ${localPort}`,
        url: `${localUrl}/1949-guningtou/`,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
