import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const chrome = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const root = path.resolve('.');
const baseUrl = 'http://localhost:4321/1949-guningtou/v2/region/';
const outputDir = path.resolve('docs/2.0/screenshots/gate-a3');
fs.mkdirSync(outputDir, { recursive: true });

const shots = [
  ['A3_WIDE_HISTORICAL_DAYLIGHT', 'a3-wide-historical-daylight', 'closed', '1920,1080'],
  ['A3_KINMEN_BASE', 'a3-kinmen-base', 'closed', '1920,1080'],
  ['A3_GUNINGTOU_BASE', 'a3-guningtou-base', 'closed', '1920,1080'],
  ['A3_MOBILE', 'a3-mobile', 'closed', '390,844'],
  ['A3_AERIAL_BLOCKED', 'a3-wide-aerial-archive', 'open', '1920,1080'],
];

function fileUrl(file) {
  return 'file:///' + file.replace(/\\/g, '/');
}

function capture(name, historical, debug, windowSize) {
  const screenshot = path.join(outputDir, name + '.png');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-1949-gate-a3-'));
  const url = baseUrl + '?historical=' + encodeURIComponent(historical) + '&debug=' + debug;
  const result = spawnSync(chrome, [
    '--headless=new',
    '--no-sandbox',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--window-size=' + windowSize,
    '--run-all-compositor-stages-before-draw',
    '--virtual-time-budget=9000',
    '--disable-extensions',
    '--no-first-run',
    '--allow-file-access-from-files',
    '--user-data-dir=' + profile,
    '--screenshot=' + screenshot,
    url,
  ], { cwd: root, encoding: 'utf8', timeout: 30_000, windowsHide: true });
  fs.rmSync(profile, { recursive: true, force: true });
  if (result.error) throw result.error;
  if (result.status !== 0 || !fs.existsSync(screenshot)) {
    throw new Error('Chrome screenshot failed for ' + name + ': ' + (result.stderr || result.stdout || result.status));
  }
  process.stdout.write(name + ': ' + screenshot + ' (' + fs.statSync(screenshot).size + ' bytes)\n');
}

for (const [name, historical, debug, windowSize] of shots) capture(name, historical, debug, windowSize);

const previousWide = path.resolve('docs/2.0/screenshots/gate-a2/A2_WIDE.png');
const historicalWide = path.join(outputDir, 'A3_WIDE_HISTORICAL_DAYLIGHT.png');
const blockedWide = path.join(outputDir, 'A3_AERIAL_BLOCKED.png');
if (!fs.existsSync(previousWide) || !fs.existsSync(historicalWide) || !fs.existsSync(blockedWide)) {
  throw new Error('Gate A.2 baseline or Gate A.3 screenshots are missing.');
}

const comparisonHtml = [
  '<!doctype html>',
  '<meta charset="utf-8">',
  '<title>Gate A.3 historical aerial comparison</title>',
  '<style>',
  '* { box-sizing: border-box; }',
  'html, body { margin: 0; background: #1d2828; color: #e7e4d7; }',
  'body { width: 1920px; height: 1080px; padding: 32px 34px; font-family: "Cascadia Mono", "IBM Plex Mono", monospace; }',
  'header { display: flex; justify-content: space-between; align-items: end; border-bottom: 1px solid rgba(225,220,194,.22); padding-bottom: 14px; }',
  'h1 { margin: 0; color: #d8c08b; font: 400 25px Georgia, serif; letter-spacing: .04em; }',
  'header p { margin: 0; color: #9aa59d; font-size: 10px; letter-spacing: .12em; }',
  'main { display: grid; grid-template-columns: repeat(3, 1fr); gap: 17px; margin-top: 19px; }',
  'article { border: 1px solid rgba(225,220,194,.22); background: #27322f; }',
  'h2 { display: flex; justify-content: space-between; gap: 8px; margin: 0; padding: 12px 13px 10px; color: #f2d89c; font-size: 12px; font-weight: 500; letter-spacing: .08em; }',
  'h2 small { color: #9aa59d; font-size: 9px; font-weight: 400; letter-spacing: .04em; }',
  'figure { margin: 0; border-top: 1px solid rgba(225,220,194,.14); }',
  'figure img { display: block; width: 100%; height: 728px; object-fit: cover; object-position: center; }',
  'article:nth-child(3) figure img { object-position: 82% center; }',
  'figcaption { min-height: 66px; padding: 10px 13px 12px; color: #9aa59d; font-size: 9px; line-height: 1.45; letter-spacing: .03em; }',
  'figcaption b { color: #e7e4d7; font-weight: 400; }',
  'footer { margin-top: 17px; color: #718079; font-size: 9px; letter-spacing: .08em; }',
  '</style>',
  '<header><h1>GATE A.3 — HISTORICAL AERIAL ART DIRECTION</h1><p>ACTUAL CHROME OUTPUT / SAME B 1.5× CAMERA FAMILY</p></header>',
  '<main>',
  '<article><h2>A.2 CURRENT <small>BASELINE</small></h2><figure><img src="' + fileUrl(previousWide) + '"><figcaption>上一關卡：現代高程參考＋無限大氣海面。<br /><b>Same strategic framing / B 1.5×</b></figcaption></figure></article>',
  '<article><h2>A.3 HISTORICAL <small>ARCHIVAL TONE</small></h2><figure><img src="' + fileUrl(historicalWide) + '"><figcaption>現代 DEM 保留；降低綠色主導，提升明亮歷史日光。<br /><b>1945 source: not bound</b></figcaption></figure></article>',
  '<article><h2>A.3 1945 AERIAL <small>SOURCE REVIEW</small></h2><figure><img src="' + fileUrl(blockedWide) + '"><figcaption>真實佔位狀態：不請求、不快取、不發布航照像素。<br /><b>Rights blocked / SOURCE REVIEW</b></figcaption></figure></article>',
  '</main>',
  '<footer>NO IMAGE RETOUCHING OR GEOGRAPHIC POSTPROCESSING — THE MIDDLE AND RIGHT PANELS ARE BROWSER OUTPUTS.</footer>',
].join('\n');

const comparisonHtmlPath = path.join(os.tmpdir(), 'codex-1949-gate-a3-comparison.html');
const comparisonPng = path.join(outputDir, 'GATE_A3_COMPARISON.png');
fs.writeFileSync(comparisonHtmlPath, comparisonHtml);
const comparisonProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-1949-gate-a3-comparison-'));
const comparisonResult = spawnSync(chrome, [
  '--headless=new',
  '--no-sandbox',
  '--hide-scrollbars',
  '--window-size=1920,1080',
  '--run-all-compositor-stages-before-draw',
  '--virtual-time-budget=3000',
  '--disable-extensions',
  '--no-first-run',
  '--allow-file-access-from-files',
  '--user-data-dir=' + comparisonProfile,
  '--screenshot=' + comparisonPng,
  fileUrl(comparisonHtmlPath),
], { cwd: root, encoding: 'utf8', timeout: 30_000, windowsHide: true });
fs.rmSync(comparisonProfile, { recursive: true, force: true });
fs.rmSync(comparisonHtmlPath, { force: true });
if (comparisonResult.error) throw comparisonResult.error;
if (comparisonResult.status !== 0 || !fs.existsSync(comparisonPng)) {
  throw new Error('Gate A.3 comparison screenshot failed: ' + (comparisonResult.stderr || comparisonResult.stdout || comparisonResult.status));
}
process.stdout.write('GATE_A3_COMPARISON: ' + comparisonPng + ' (' + fs.statSync(comparisonPng).size + ' bytes)\n');
