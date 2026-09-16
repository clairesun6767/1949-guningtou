import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(ROOT, '..');
const SOURCE_ROOT = path.join(PROJECT_ROOT, '.local', 'aerial-poc');
const PUBLIC_ROOT = path.join(PROJECT_ROOT, 'public', '.local', 'aerial-poc');

const LOW_RES_FILES = [
  '1944/mosaic-z12.png',
  '1944/valid-mask-z12.png',
  '1945/mosaic-z12.png',
  '1945/valid-mask-z12.png',
  '1958/mosaic-z12.png',
  '1958/valid-mask-z12.png',
  'smart/smart-composite-z12.png',
  'smart/source-mask-z12.png',
];

const PUBLICATION = {
  status: 'PUBLIC LOW-RES POC',
  authorization: 'USER-AUTHORIZED FOR GITHUB REPOSITORY AND GITHUB PAGES REVIEW',
  authorizedAt: '2026-09-16',
  maximumPublishedZoom: 12,
  note: 'Only derived low-resolution Kinmen mosaics are published; source tiles, higher-zoom review assets, screenshots and Xiamen candidate JPEGs remain excluded.',
};

async function publish() {
  await mkdir(PUBLIC_ROOT, { recursive: true });
  const manifest = JSON.parse(await readFile(path.join(SOURCE_ROOT, 'manifest.json'), 'utf8'));
  manifest.localOnly = true;
  manifest.rightsStatus = 'APPROVED';
  manifest.usageStatus = 'PUBLIC LOW-RES POC — USER AUTHORIZED';
  manifest.publication = PUBLICATION;
  manifest.datasets = manifest.datasets.map(dataset => ({
    ...dataset,
    sourceKmlPath: `public/research/kinmen-kml/kinmen-${dataset.year}.kml`,
    rightsStatus: 'APPROVED',
    validPixelMask: dataset.validPixelMask
      ? {
          ...dataset.validPixelMask,
          localPath: `public/.local/aerial-poc/${dataset.year}/valid-mask-z12.png`,
        }
      : dataset.validPixelMask,
    mosaic: dataset.mosaic
      ? {
          ...dataset.mosaic,
          localPath: `public/.local/aerial-poc/${dataset.year}/mosaic-z12.png`,
        }
      : dataset.mosaic,
  }));

  for (const relativePath of LOW_RES_FILES) {
    const source = path.join(SOURCE_ROOT, relativePath);
    const destination = path.join(PUBLIC_ROOT, relativePath);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(source, destination, { force: true });
  }

  const serialized = JSON.stringify(manifest, null, 2) + '\n';
  await writeFile(path.join(PUBLIC_ROOT, 'manifest.json'), serialized, 'utf8');
  // Keep the ignored local dev manifest in sync with the authorization record.
  await writeFile(path.join(SOURCE_ROOT, 'manifest.json'), serialized, 'utf8');

  const bytes = await Promise.all(LOW_RES_FILES.map(async relativePath => {
    const file = await readFile(path.join(PUBLIC_ROOT, relativePath));
    return file.byteLength;
  }));
  console.log(JSON.stringify({
    output: path.relative(PROJECT_ROOT, PUBLIC_ROOT).replaceAll('\\', '/'),
    files: LOW_RES_FILES.length + 1,
    bytes: bytes.reduce((total, value) => total + value, 0),
    publication: PUBLICATION,
  }, null, 2));
}

publish().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
