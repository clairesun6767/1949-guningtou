import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const requiredRoutes = [
  { url: '/1949-guningtou/zh-tw/', output: 'zh-tw/index.html' },
  { url: '/1949-guningtou/zh-cn/', output: 'zh-cn/index.html' },
  { url: '/1949-guningtou/en/', output: 'en/index.html' },
  { url: '/1949-guningtou/zh-tw/map/', output: 'zh-tw/map/index.html' },
  { url: '/1949-guningtou/zh-tw/then-and-now/', output: 'zh-tw/then-and-now/index.html' },
];

if (!fs.existsSync(dist)) {
  console.error('dist/ is missing; run npm run build first.');
  process.exit(1);
}

const missing = requiredRoutes
  .filter(({ output }) => !fs.existsSync(path.join(dist, output)))
  .map(({ output }) => output);
if (missing.length > 0) {
  console.error(JSON.stringify({ missing }, null, 2));
  process.exit(1);
}

const html = requiredRoutes.map(({ output }) => fs.readFileSync(path.join(dist, output), 'utf8')).join('\n');
const hasAbsoluteWindowsPath = /(?:[A-Z]:\\|file:\/\/)/i.test(html);
const hasLocalhostReference = /https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?/i.test(html);
const basePathErrors = requiredRoutes
  .filter(({ url, output }) => {
    const page = fs.readFileSync(path.join(dist, output), 'utf8');
    return !page.includes('/1949-guningtou/') || !page.includes(url);
  })
  .map(({ url, output }) => ({ url, output }));
if (hasAbsoluteWindowsPath || hasLocalhostReference || basePathErrors.length > 0) {
  console.error(JSON.stringify({ hasAbsoluteWindowsPath, hasLocalhostReference, basePathErrors }, null, 2));
  process.exit(1);
}

const result = {
  generatedAt: new Date().toISOString(),
  routes: requiredRoutes.map(({ url, output }) => ({ url, output })),
  routeCount: requiredRoutes.length,
  basePath: '/1949-guningtou/',
  absoluteWindowsPath: hasAbsoluteWindowsPath,
  localhostReference: hasLocalhostReference,
  basePathErrors,
};
fs.mkdirSync(path.join(root, 'docs', 'quality'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs', 'quality', 'V4_STATIC_OUTPUT_AUDIT.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(result, null, 2));
