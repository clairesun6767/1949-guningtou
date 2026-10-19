import { expect, test, type Page, type TestInfo } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE_PATH = process.env.PREVIEW_BASE_PATH?.replace(/\/$/, '') || '/1949-guningtou';
const artifactRoot = path.resolve(process.env.VISUAL_ARTIFACT_DIR ?? 'artifacts/visual-acceptance');
const postwarSections = [
  ['01｜1949 與今日', 'overview'],
  ['02｜戰場影像對照', 'images'],
  ['03｜古寧頭戰場探索', 'explore'],
  ['04｜軍事據點活化', 'activation'],
  ['05｜留下的歷史痕跡', 'traces'],
] as const;

type RuntimeIssues = {
  pageErrors: string[];
  consoleErrors: string[];
  httpErrors: string[];
};

function safeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
}

function attachRuntimeGuards(page: Page): RuntimeIssues {
  const issues: RuntimeIssues = { pageErrors: [], consoleErrors: [], httpErrors: [] };
  page.on('pageerror', (error) => issues.pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const source = message.location().url;
      issues.consoleErrors.push(source ? `${message.text()} (${source})` : message.text());
    }
  });
  page.on('response', (response) => {
    if (response.status() < 400) return;
    issues.httpErrors.push(`${response.status()} ${response.url()}`);
  });
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText ?? 'unknown';
    if (failure !== 'net::ERR_ABORTED') issues.httpErrors.push(`FAILED ${request.url()} ${failure}`);
  });
  return issues;
}

async function openPage(page: Page, route: string) {
  const issues = attachRuntimeGuards(page);
  const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
  expect(response, `No response for ${route}`).not.toBeNull();
  expect(response?.status(), `HTTP response for ${route}`).toBeLessThan(400);
  await page.waitForTimeout(700);
  await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; });
  return issues;
}

async function assertImages(page: Page) {
  const images = page.locator('img');
  const count = await images.count();
  for (let index = 0; index < count; index += 1) await images.nth(index).scrollIntoViewIfNeeded();
  await page.waitForFunction(
    () => Array.from(document.images).every((image) => image.complete),
    undefined,
    { timeout: 15_000 },
  );
  const broken = await images.evaluateAll((elements) => elements
    .map((element) => {
      const image = element as HTMLImageElement;
      return { src: image.currentSrc || image.src, complete: image.complete, naturalWidth: image.naturalWidth };
    })
    .filter((image) => image.src && (!image.complete || image.naturalWidth === 0)));
  expect(broken, 'Images must finish loading with a non-zero natural width').toEqual([]);
}

async function assertNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }));
  expect(dimensions.scrollWidth - dimensions.clientWidth, 'Document has horizontal overflow').toBeLessThanOrEqual(2);
  expect(dimensions.bodyScrollWidth - dimensions.clientWidth, 'Body has horizontal overflow').toBeLessThanOrEqual(2);
}

async function assertHealthy(page: Page, issues: RuntimeIssues) {
  await assertImages(page);
  await assertNoHorizontalOverflow(page);
  await page.waitForTimeout(300);
  expect(issues.pageErrors, 'JavaScript page errors').toEqual([]);
  expect(issues.consoleErrors, 'JavaScript console errors').toEqual([]);
  expect(issues.httpErrors, 'HTTP asset or page errors').toEqual([]);
}

async function capture(page: Page, testInfo: TestInfo, name: string, fullPage = false) {
  const project = safeName(testInfo.project.name);
  const filename = `${project}-${safeName(name)}.png`;
  const directory = path.join(artifactRoot, project);
  const target = path.join(directory, filename);
  await fs.mkdir(directory, { recursive: true });
  await page.screenshot({ path: target, fullPage });
  return target;
}

test.describe('remote preview visual acceptance', () => {
  test('public content routes render in all three languages', async ({ page }) => {
    test.setTimeout(180_000);
    const checks = [
      [`${BASE_PATH}/zh-cn/`, '1949'],
      [`${BASE_PATH}/en/`, '1949'],
      [`${BASE_PATH}/zh-cn/timeline/`, '战役时间轴'],
      [`${BASE_PATH}/en/timeline/`, 'Battle timeline'],
      [`${BASE_PATH}/zh-cn/archive/`, '数位典藏'],
      [`${BASE_PATH}/en/archive/`, 'Digital archive'],
      [`${BASE_PATH}/zh-cn/locations/POI-0016/`, '古宁头战史馆'],
      [`${BASE_PATH}/en/locations/POI-0016/`, 'Guningtou War Museum'],
      [`${BASE_PATH}/zh-cn/figures/PER-0024/`, '叶飞'],
      [`${BASE_PATH}/en/figures/PER-0024/`, 'Ye Fei'],
      [`${BASE_PATH}/zh-cn/then-and-now/`, '昔日战场'],
      [`${BASE_PATH}/en/then-and-now/`, 'Guningtou: Then & Now'],
    ] as const;

    for (const [route, marker] of checks) {
      const issues = await openPage(page, route);
      await expect(page.getByRole('main'), `Missing translated marker on ${route}`).toContainText(marker);
      await assertHealthy(page, issues);
    }
  });

  test('homepage layout, search, and responsive navigation', async ({ page }, testInfo) => {
    const issues = await openPage(page, `${BASE_PATH}/zh-tw/`);
    await expect(page.getByRole('main')).toContainText('1949');
    await capture(page, testInfo, 'homepage', true);
    await expect(page.locator('.museum-nav__link')).toHaveCount(1);
    await expect(page.locator('.museum-nav__group')).toHaveCount(5);
    await expect(page.locator('.museum-nav')).not.toContainText('和平與計畫');
    await expect(page.locator('.museum-nav')).not.toContainText('Battlefield OS');

    const search = page.getByLabel('搜尋網站內容');
    if (await search.isVisible()) {
      await search.fill('古寧頭');
      await expect(page.locator('#museum-search-results')).toBeVisible();
      await search.fill('');
    }

    const mobileMenu = page.locator('.museum-mobile-menu > summary');
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
      await expect(page.locator('.museum-mobile-menu__panel')).toBeVisible();
      const afterwarGroup = page.locator('.museum-mobile-menu__panel details').filter({ hasText: '戰後金門' }).first();
      await expect(afterwarGroup).toBeVisible();
      await afterwarGroup.locator('summary').click();
      for (const [label, sectionId] of postwarSections) {
        await expect(afterwarGroup.locator('a').filter({ hasText: label })).toHaveAttribute('href', `${BASE_PATH}/zh-tw/then-and-now/#${sectionId}`);
      }
      await capture(page, testInfo, 'homepage-postwar-menu');
    } else {
      const afterwarSummary = page.locator('.museum-nav__summary').filter({ hasText: '戰後金門' }).first();
      await expect(afterwarSummary).toBeVisible();
      await afterwarSummary.hover();
      const dropdown = page.locator('.museum-nav__dropdown').filter({ hasText: '01｜1949 與今日' }).first();
      await expect(dropdown).toBeVisible();
      for (const [label, sectionId] of postwarSections) {
        await expect(dropdown.locator('a').filter({ hasText: label })).toHaveAttribute('href', `${BASE_PATH}/zh-tw/then-and-now/#${sectionId}`);
      }
      await capture(page, testInfo, 'homepage-postwar-menu');
    }
    await assertHealthy(page, issues);
  });

  test('then-and-now five sections, image comparison, and map marker', async ({ page }, testInfo) => {
    const issues = await openPage(page, `${BASE_PATH}/zh-tw/then-and-now/`);
    const projectDirectory = path.join(artifactRoot, safeName(testInfo.project.name));
    await fs.mkdir(projectDirectory, { recursive: true });
    for (const sectionId of ['overview', 'images', 'explore', 'activation', 'traces']) {
      const section = page.locator(`#${sectionId}`);
      await expect(section, `Missing then-and-now section #${sectionId}`).toBeVisible();
      await section.scrollIntoViewIfNeeded();
      await section.screenshot({ path: path.join(projectDirectory, `${safeName(testInfo.project.name)}-then-now-${sectionId}.png`) });
    }

    const opacity = page.getByLabel('昔日航照透明度');
    await expect(opacity).toBeVisible();
    await opacity.fill('74');
    await expect(page.locator('.then-now-map-compare__control output')).toHaveText('74%');

    const marker = page.locator('.then-now-map-compare .leaflet-interactive').first();
    await expect(marker, 'Then-and-now Leaflet marker layer did not initialize').toBeVisible();
    await marker.scrollIntoViewIfNeeded();
    await marker.click({ force: true });
    await expect(page.locator('.then-now-map-compare__selection strong')).not.toHaveText('點選地圖標記查看地點');
    await capture(page, testInfo, 'then-now-full', true);
    await assertHealthy(page, issues);
  });

  test('battle map renderer, timeline, and playback controls', async ({ page }, testInfo) => {
    const issues = await openPage(page, `${BASE_PATH}/zh-tw/map/`);
    const renderer = page.locator('[aria-label="Three.js stylized historical terrain scene"], canvas').first();
    await expect(renderer, 'Interactive map renderer did not initialize').toBeVisible({ timeout: 45_000 });
    const deckToggle = page.locator('.historical-map__deck-toggle');
    await expect(deckToggle).toHaveAttribute('aria-expanded', 'false');
    await deckToggle.click();
    await expect(deckToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.historical-map__controls')).toBeVisible();

    const timelineButton = page.locator('.historical-map__controls button').filter({ hasText: '時間' }).first();
    await expect(timelineButton).toBeVisible();
    await timelineButton.click();
    await expect(page.locator('#battle-map-timeline')).toBeVisible();
    const dateSlider = page.getByLabel('Battle timeline date');
    await dateSlider.fill('1');
    await expect(page.locator('.historical-map__timeline-copy')).toContainText('1949-10-26');

    const playback = page.locator('.historical-map__playback');
    const playButton = playback.locator('button.is-primary');
    await playButton.click();
    await expect(playback).toHaveAttribute('data-playback-state', 'playing');
    await playButton.click();
    await expect(playback).toHaveAttribute('data-playback-state', 'paused');
    await capture(page, testInfo, 'map', true);
    await assertHealthy(page, issues);
  });

  test('location detail layout and media', async ({ page }, testInfo) => {
    const issues = await openPage(page, `${BASE_PATH}/zh-tw/locations/POI-0016/`);
    await expect(page.getByRole('main')).toContainText(/古寧頭戰史館|Guningtou/);
    await capture(page, testInfo, 'location-detail', true);
    await assertHealthy(page, issues);
  });
});
