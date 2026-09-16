import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const chrome = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const root = path.resolve('.');
const baseUrl = 'http://localhost:4321/1949-guningtou/v2/region/';
const outputPath = path.resolve(process.env.GATE_A3P2_OUTPUT ?? 'docs/2.0/screenshots/gate-a3p1/performance.json');
const port = 9223;
const reviewCamera = 'camera=art-review-kinmen-xiamen-01';
const shots = [
  { name: 'P0', query: `?historical=H0&environment=P0&time=T0&weather=W0&${reviewCamera}&debug=open`, privacy: 'safe' },
  { name: 'P1', query: `?historical=H0&environment=P1&time=T0&weather=W1&${reviewCamera}&debug=open`, privacy: 'safe' },
  { name: 'P2', query: `?historical=H6&aerial=local&environment=P2&time=T2&weather=W0&opacity=65&${reviewCamera}&debug=open`, privacy: 'local-only' },
  { name: 'P3', query: `?historical=H7&aerial=local&environment=P3&time=T0&weather=W1&opacity=65&${reviewCamera}&debug=open`, privacy: 'local-only' },
];

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitForJson(url, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();
    } catch {
      // Chrome has not opened its DevTools endpoint yet.
    }
    await sleep(150);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function connectCdp(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    let nextId = 0;
    const pending = new Map();
    socket.addEventListener('open', () => resolve({
      async send(method, params = {}) {
        const id = ++nextId;
        const result = new Promise((resolveResult, rejectResult) => pending.set(id, { resolve: resolveResult, reject: rejectResult }));
        socket.send(JSON.stringify({ id, method, params }));
        return result;
      },
      close() { socket.close(); },
    }));
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (!message.id || !pending.has(message.id)) return;
      const item = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) item.reject(new Error(message.error.message));
      else item.resolve(message.result);
    });
    socket.addEventListener('error', error => reject(error));
  });
}

async function sampleShot(shot) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-1949-gate-a3p1-perf-'));
  const browser = spawn(chrome, [
    '--headless=new',
    '--no-sandbox',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--window-size=1920,1080',
    '--disable-extensions',
    '--no-first-run',
    '--allow-file-access-from-files',
    `--remote-debugging-port=${port}`,
    '--user-data-dir=' + profile,
    baseUrl + shot.query,
  ], { cwd: root, windowsHide: true, stdio: 'ignore' });

  let cdp;
  try {
    const version = await waitForJson(`http://127.0.0.1:${port}/json/version`);
    const page = await waitForJson(`http://127.0.0.1:${port}/json`);
    cdp = await connectCdp(page.find(item => item.type === 'page')?.webSocketDebuggerUrl ?? version.webSocketDebuggerUrl);
    await cdp.send('Runtime.enable');
    await sleep(4000);
    const evaluation = await cdp.send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `new Promise(resolve => {
        const frames = [];
        let last = performance.now();
        const started = last;
        function sample(now) {
          frames.push(now - last);
          last = now;
          if (frames.length < 150) requestAnimationFrame(sample);
          else {
            const sorted = frames.slice(5).sort((a, b) => a - b);
            const average = frames.slice(5).reduce((sum, value) => sum + value, 0) / Math.max(frames.length - 5, 1);
            const percentile = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ?? average;
            const canvas = [...document.querySelectorAll('canvas')].sort((a, b) => (b.width * b.height) - (a.width * a.height))[0];
            const metric = document.querySelector('.region-debug__metric-strip')?.textContent ?? '';
            const stats = document.querySelector('.region-debug__stats')?.textContent ?? '';
            const renderer = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl');
            const debugInfo = renderer?.getExtension('WEBGL_debug_renderer_info');
            resolve(JSON.stringify({
              viewport: { innerWidth, innerHeight, devicePixelRatio },
              canvas: canvas ? { width: canvas.width, height: canvas.height, cssWidth: canvas.clientWidth, cssHeight: canvas.clientHeight } : null,
              frames: frames.length,
              elapsedMs: performance.now() - started,
              averageFrameMs: average,
              p95FrameMs: percentile,
              fps: 1000 / Math.max(average, 0.001),
              metric,
              stats,
              renderer: debugInfo ? renderer.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'WebGL renderer unavailable',
            }));
          }
        }
        requestAnimationFrame(sample);
      })`,
    });
    const value = evaluation?.result?.value;
    if (!value) throw new Error(`No benchmark result for ${shot.name}`);
    return { name: shot.name, query: shot.query, privacy: shot.privacy, ...JSON.parse(value) };
  } finally {
    cdp?.close();
    browser.kill();
    await new Promise(resolve => {
      if (browser.exitCode !== null) resolve();
      else browser.once('close', resolve);
    });
    try {
      fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 120 });
    } catch (error) {
      process.stderr.write(`benchmark profile cleanup deferred: ${profile} (${error.code ?? 'unknown'})\n`);
    }
  }
}

const results = [];
for (const shot of shots) {
  const result = await sampleShot(shot);
  results.push(result);
  process.stdout.write(`${shot.name}: ${result.fps.toFixed(1)} FPS · ${result.averageFrameMs.toFixed(1)} ms · ${result.canvas?.width ?? '—'}×${result.canvas?.height ?? '—'}\n`);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify({
  generatedAt: new Date().toISOString(),
  browser: 'Chrome headless=new with wall-clock requestAnimationFrame sampling',
  camera: 'ART_REVIEW_KINMEN_XIAMEN_01',
  viewport: '1920×1080',
  sampleFrames: 150,
  privacy: 'safe metadata plus local-only performance metadata; no aerial pixels are written',
  results,
}, null, 2) + '\n');
