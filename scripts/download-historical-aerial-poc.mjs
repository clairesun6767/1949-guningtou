import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const DEFAULT_KML_DIR = 'C:\\Users\\user\\Downloads';
const DEFAULT_OUTPUT = path.join(ROOT, '.local', 'aerial-poc');
// Keep the low-zoom context compact, but include the eastern Kinmen peninsula
// so a higher-zoom Guningtou review does not fall back to modern DEM halfway
// across the island. This still resolves to only 3 x 2 tiles per year at z12.
const AREA_BOUNDS = { west: 118.278, south: 24.438, east: 118.475, north: 24.52 };
const MAX_TILES = 128;
const MAX_BYTES = 50 * 1024 * 1024;
const TILE_SIZE = 256;
const DEFAULT_ZOOM = 12;
const REQUEST_DELAY_MS = 250;
const KML_FILES = {
  1944: '金門舊航照影像(1944) (1).kml',
  1945: '金門舊航照影像(1945).kml',
  1958: '金門舊航照圖(1958.09.10).kml',
};

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

function decodeXml(value) {
  return value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

function tagValue(block, tag) {
  const match = block.match(new RegExp(`<(?:(?:[\\w-]+):)?${tag}\\b[^>]*>([\\s\\S]*?)<\\/(?:(?:[\\w-]+):)?${tag}>`, 'i'));
  return match ? decodeXml(match[1].trim()) : undefined;
}

function numberTag(block, tag, fallback) {
  const value = tagValue(block, tag);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseKml(text, sourceKmlPath, expectedYear) {
  const blocks = [...text.matchAll(/<GroundOverlay\b[^>]*>([\s\S]*?)<\/GroundOverlay>/gi)].map(match => match[1]);
  const block = blocks.find(item => /<MapTilePyramid\b|<gx:MapTilePyramid\b/i.test(item));
  if (!block) throw new Error('KML FILE NOT FOUND OR NO MAP TILE PYRAMID');
  const name = tagValue(block, 'name') ?? '';
  const box = tagValue(block, 'LatLonBox') ?? '';
  const bounds = {
    west: numberTag(box, 'west', NaN),
    south: numberTag(box, 'south', NaN),
    east: numberTag(box, 'east', NaN),
    north: numberTag(box, 'north', NaN),
  };
  const pyramid = block.match(/<(?:(?:[\w-]+):)?MapTilePyramid\b[^>]*>([\s\S]*?)<\/(?:(?:[\w-]+):)?MapTilePyramid>/i)?.[1] ?? '';
  const href = tagValue(pyramid, 'href') ?? '';
  const minLevel = numberTag(pyramid, 'minLevel', 0);
  const maxLevel = numberTag(pyramid, 'maxLevel', 19);
  if (!name || expectedYear.toString() !== (name.match(/(1944|1945|1958)/)?.[1] ?? '') || !Number.isFinite(bounds.west) || bounds.west >= bounds.east || bounds.south >= bounds.north || !href.includes('{{z}}') || !href.includes('{{x}}') || !href.includes('{{y}}')) {
    throw new Error(`Invalid KML metadata: ${sourceKmlPath}`);
  }
  return { id: `KINMEN_${expectedYear}`, name, year: expectedYear, bounds, tileTemplate: href, minLevel, maxLevel, tileSize: TILE_SIZE, projection: 'EPSG:3857 / GoogleMapsCompatible', sourceKmlPath, coordinateOrder: 'XYZ' };
}

function intersects(left, right) {
  return left.west <= right.east && left.east >= right.west && left.south <= right.north && left.north >= right.south;
}

function clampLatitude(latitude) {
  return Math.max(-85.05112878, Math.min(85.05112878, latitude));
}

function lonLatToTile(longitude, latitude, z) {
  const scale = 2 ** z;
  const radians = (clampLatitude(latitude) * Math.PI) / 180;
  const x = Math.max(0, Math.min(scale - 1, Math.floor(((longitude + 180) / 360) * scale)));
  const y = Math.max(0, Math.min(scale - 1, Math.floor(((1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2) * scale)));
  return { z, x, y };
}

function enumerateTiles(bounds, z) {
  const northwest = lonLatToTile(bounds.west, bounds.north, z);
  const southeast = lonLatToTile(bounds.east, bounds.south, z);
  const tiles = [];
  for (let x = northwest.x; x <= southeast.x; x += 1) for (let y = northwest.y; y <= southeast.y; y += 1) tiles.push({ z, x, y });
  return tiles;
}

function expandTemplate(template, tile) {
  return template.replace(/\{\{z\}\}/g, String(tile.z)).replace(/\{\{x\}\}/g, String(tile.x)).replace(/\{\{y\}\}/g, String(tile.y));
}

function isPlaceholder(bytes, contentType) {
  const data = new Uint8Array(bytes);
  const type = (contentType ?? '').toLowerCase();
  if (type.includes('text/html') || type.includes('application/json')) return true;
  if (type.includes('gif') && data.length <= 256) return true;
  if (data.length <= 128) return true;
  return data.length >= 10 && data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46 && data[6] === 1 && data[7] === 0 && data[8] === 1 && data[9] === 0;
}

function qualityFromRaw(raw, width, height, channels = 4) {
  const values = [];
  const histogram = new Uint32Array(32);
  let valid = 0;
  let alphaValid = 0;
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * channels;
    const red = raw[offset] ?? 0;
    const green = raw[offset + Math.min(1, channels - 1)] ?? red;
    const blue = raw[offset + Math.min(2, channels - 1)] ?? green;
    const alpha = channels >= 4 ? raw[offset + 3] ?? 255 : 255;
    if (alpha > 8) alphaValid += 1;
    if (alpha <= 8 || (red <= 1 && green <= 1 && blue <= 1 && alpha < 250)) continue;
    const luminance = (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255;
    values.push(luminance);
    histogram[Math.min(31, Math.floor(luminance * 32))] += 1;
    valid += 1;
  }
  const mean = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const deviation = values.length ? Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length) : 0;
  const entropy = histogram.reduce((sum, count) => {
    if (!count || !valid) return sum;
    const probability = count / valid;
    return sum - probability * Math.log2(probability);
  }, 0);
  const sampleStep = Math.max(1, Math.floor(Math.sqrt((width * height) / 120_000)));
  let laplacian = 0;
  let laplacianCount = 0;
  const luminanceAt = (x, y) => {
    const offset = (y * width + x) * channels;
    return ((raw[offset] ?? 0) * 0.2126 + (raw[offset + Math.min(1, channels - 1)] ?? 0) * 0.7152 + (raw[offset + Math.min(2, channels - 1)] ?? 0) * 0.0722) / 255;
  };
  for (let y = sampleStep; y < height - sampleStep; y += sampleStep) for (let x = sampleStep; x < width - sampleStep; x += sampleStep) {
    const center = luminanceAt(x, y);
    laplacian += Math.abs(luminanceAt(x - sampleStep, y) + luminanceAt(x + sampleStep, y) + luminanceAt(x, y - sampleStep) + luminanceAt(x, y + sampleStep) - center * 4);
    laplacianCount += 1;
  }
  const sharpness = Math.min(1, (laplacian / Math.max(1, laplacianCount)) * 3.2);
  const contrast = Math.min(1, deviation * 2.6);
  const entropyScore = Math.min(1, entropy / 5);
  const alphaValidRatio = alphaValid / Math.max(1, width * height);
  const validPixelRatio = valid / Math.max(1, width * height);
  const informationDensity = Math.min(1, (deviation * 1.35 + entropyScore) / 1.7);
  const rawScore = sharpness * 0.3 + contrast * 0.18 + entropyScore * 0.16 + alphaValidRatio * 0.1 + informationDensity * 0.16 + validPixelRatio * 0.1;
  return { normalizedScore: rawScore, sharpness, contrast, entropy: entropyScore, alphaValidRatio, informationDensity, validPixelRatio, sampleCount: valid, confidence: 'measured-local-poc' };
}

function rawQualityScore(quality) {
  return quality.sharpness * 0.3
    + quality.contrast * 0.18
    + quality.entropy * 0.16
    + quality.alphaValidRatio * 0.1
    + quality.informationDensity * 0.16
    + quality.validPixelRatio * 0.1;
}

function normalizeQualitySet(results) {
  const qualities = results.flatMap(result => [
    result.quality,
    ...result.tiles.map(tile => tile.quality),
  ]).filter(Boolean);
  const scores = qualities.map(rawQualityScore);
  const minScore = scores.length ? Math.min(...scores) : 0;
  const maxScore = scores.length ? Math.max(...scores) : 1;
  const normalize = quality => {
    const rawScore = rawQualityScore(quality);
    quality.normalizedScore = maxScore > minScore
      ? Math.min(1, Math.max(0, (rawScore - minScore) / (maxScore - minScore)))
      : rawScore;
  };
  for (const result of results) {
    normalize(result.quality);
    for (const tile of result.tiles) if (tile.quality) normalize(tile.quality);
  }
  return { minScore, maxScore };
}

function tileRangeBounds(minX, maxX, minY, maxY, z) {
  const scale = 2 ** z;
  const west = (minX / scale) * 360 - 180;
  const east = ((maxX + 1) / scale) * 360 - 180;
  const north = (Math.atan(Math.sinh(Math.PI * (1 - (2 * minY) / scale))) * 180) / Math.PI;
  const south = (Math.atan(Math.sinh(Math.PI * (1 - (2 * (maxY + 1)) / scale))) * 180) / Math.PI;
  return { west, south, east, north };
}

function tileRangeFromTiles(tiles) {
  if (!tiles.length) return undefined;
  return {
    z: tiles[0].z,
    minX: Math.min(...tiles.map(tile => tile.x)),
    maxX: Math.max(...tiles.map(tile => tile.x)),
    minY: Math.min(...tiles.map(tile => tile.y)),
    maxY: Math.max(...tiles.map(tile => tile.y)),
  };
}

function closeEnough(left, right) {
  return Math.abs(left - right) <= 1e-10;
}

function boundsMatch(left, right) {
  return closeEnough(left.west, right.west)
    && closeEnough(left.south, right.south)
    && closeEnough(left.east, right.east)
    && closeEnough(left.north, right.north);
}

function smartCompositeUsesCommonGeographicGrid(mosaics) {
  if (!mosaics.length) return false;
  const first = mosaics[0];
  return mosaics.every(mosaic => {
    const expectedWidth = (mosaic.tileRange.maxX - mosaic.tileRange.minX + 1) * mosaic.tileSize;
    const expectedHeight = (mosaic.tileRange.maxY - mosaic.tileRange.minY + 1) * mosaic.tileSize;
    const expectedBounds = tileRangeBounds(
      mosaic.tileRange.minX,
      mosaic.tileRange.maxX,
      mosaic.tileRange.minY,
      mosaic.tileRange.maxY,
      mosaic.tileRange.z,
    );
    return mosaic.tileRange.z === first.tileRange.z
      && mosaic.tileSize === first.tileSize
      && mosaic.width === expectedWidth
      && mosaic.height === expectedHeight
      && boundsMatch(mosaic.bounds, expectedBounds);
  });
}

async function readKmlDatasets(kmlDir) {
  const datasets = [];
  for (const [yearText, filename] of Object.entries(KML_FILES)) {
    const sourceKmlPath = path.join(kmlDir, filename);
    if (!existsSync(sourceKmlPath)) throw new Error(`KML FILE NOT FOUND: ${sourceKmlPath}`);
    const text = await readFile(sourceKmlPath, 'utf8');
    datasets.push(parseKml(text, sourceKmlPath, Number(yearText)));
  }
  return datasets;
}

async function downloadDataset(dataset, bounds, zoom, output, state) {
  const requestBounds = { west: Math.max(bounds.west, dataset.bounds.west), south: Math.max(bounds.south, dataset.bounds.south), east: Math.min(bounds.east, dataset.bounds.east), north: Math.min(bounds.north, dataset.bounds.north) };
  if (!intersects(requestBounds, dataset.bounds)) return { dataset, tiles: [], status: 'NO OVERLAP' };
  const requestedTiles = enumerateTiles(requestBounds, zoom);
  const requestedTileRange = tileRangeFromTiles(requestedTiles);
  const datasetDir = path.join(output, String(dataset.year));
  const tileRecords = [];
  let bytes = 0;
  for (const tile of requestedTiles) {
    if (state.totalTiles >= MAX_TILES) throw new Error(`AERIAL TILE BUDGET EXCEEDED: ${MAX_TILES}`);
    const url = expandTemplate(dataset.tileTemplate, tile);
    const waitMs = Math.max(0, REQUEST_DELAY_MS - (Date.now() - state.lastRequestAt));
    if (waitMs) await new Promise(resolve => setTimeout(resolve, waitMs));
    state.lastRequestAt = Date.now();
    const response = await fetch(url, { headers: { accept: 'image/png,image/*;q=0.8,*/*;q=0.1' } });
    const buffer = new Uint8Array(await response.arrayBuffer());
    state.totalTiles += 1;
    if (!response.ok || isPlaceholder(buffer, response.headers.get('content-type'))) {
      tileRecords.push({ ...tile, url, status: 'MISSING_OR_PLACEHOLDER', bytes: buffer.byteLength });
      continue;
    }
    if (state.totalBytes + buffer.byteLength > MAX_BYTES) throw new Error(`AERIAL BYTE BUDGET EXCEEDED: ${MAX_BYTES}`);
    state.totalBytes += buffer.byteLength;
    bytes += buffer.byteLength;
    const tilePath = path.join(datasetDir, 'tiles', String(tile.z), String(tile.x), `${tile.y}.png`);
    await mkdir(path.dirname(tilePath), { recursive: true });
    await writeFile(tilePath, buffer);
    const decoded = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const quality = qualityFromRaw(decoded.data, decoded.info.width, decoded.info.height, decoded.info.channels);
    tileRecords.push({ ...tile, url, status: 'READY', bytes: buffer.byteLength, width: decoded.info.width, height: decoded.info.height, quality, localPath: path.relative(ROOT, tilePath).replaceAll('\\', '/') });
  }
  const ready = tileRecords.filter(record => record.status === 'READY');
  if (!ready.length) return { dataset, tiles: tileRecords, status: 'NO VALID PIXELS', bytes, requestedTileRange };
  const minX = Math.min(...ready.map(tile => tile.x));
  const maxX = Math.max(...ready.map(tile => tile.x));
  const minY = Math.min(...ready.map(tile => tile.y));
  const maxY = Math.max(...ready.map(tile => tile.y));
  const width = (maxX - minX + 1) * TILE_SIZE;
  const height = (maxY - minY + 1) * TILE_SIZE;
  const composites = [];
  for (const record of ready) {
    const buffer = await readFile(path.join(ROOT, record.localPath));
    composites.push({ input: buffer, left: (record.x - minX) * TILE_SIZE, top: (record.y - minY) * TILE_SIZE });
  }
  const actualTileRange = { z: zoom, minX, maxX, minY, maxY };
  const actualMosaicBounds = tileRangeBounds(minX, maxX, minY, maxY, zoom);
  const mosaicPath = path.join(datasetDir, `mosaic-z${zoom}.png`);
  await sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(composites).png().toFile(mosaicPath);
  const mosaicRaw = await sharp(mosaicPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const quality = qualityFromRaw(mosaicRaw.data, mosaicRaw.info.width, mosaicRaw.info.height, mosaicRaw.info.channels);
  const validMask = Buffer.alloc(width * height);
  for (let index = 0; index < width * height; index += 1) validMask[index] = (mosaicRaw.data[index * mosaicRaw.info.channels + 3] ?? 0) > 8 ? 255 : 0;
  const validMaskPath = path.join(datasetDir, `valid-mask-z${zoom}.png`);
  await sharp(validMask, { raw: { width, height, channels: 1 } }).png().toFile(validMaskPath);
  const validPixelMask = {
    localPath: path.relative(ROOT, validMaskPath).replaceAll('\\', '/'),
    url: `/1949-guningtou/.local/aerial-poc/${dataset.year}/valid-mask-z${zoom}.png`,
    width,
    height,
    bytes: (await stat(validMaskPath)).size,
    encoding: 'alpha>8',
  };
  return {
    dataset,
    tiles: tileRecords,
    status: 'READY',
    bytes,
    requestedTileRange,
    actualMosaicBounds,
    validPixelMask,
    mosaic: {
      localPath: path.relative(ROOT, mosaicPath).replaceAll('\\', '/'),
      url: `/1949-guningtou/.local/aerial-poc/${dataset.year}/mosaic-z${zoom}.png`,
      width,
      height,
      bounds: actualMosaicBounds,
      actualMosaicBounds,
      tileRange: actualTileRange,
      validPixelMask,
      bytes: (await stat(mosaicPath)).size,
    },
    quality,
    tileRange: actualTileRange,
  };
}

async function makeSmartComposite(results, output, zoom) {
  const ready = results.filter(result => result.mosaic && result.tileRange);
  if (!ready.length) return { status: 'NO VALID PIXELS' };
  const sourceGrids = ready.map(result => ({
    tileRange: result.tileRange,
    bounds: result.actualMosaicBounds ?? result.mosaic.bounds,
    width: result.mosaic.width,
    height: result.mosaic.height,
    tileSize: TILE_SIZE,
  }));
  if (!smartCompositeUsesCommonGeographicGrid(sourceGrids)) {
    throw new Error('SMART COMPOSITE GRID MISMATCH: reproject/resample source mosaics to one XYZ geographic grid before compositing.');
  }
  const minX = Math.min(...ready.map(result => result.tileRange.minX));
  const maxX = Math.max(...ready.map(result => result.tileRange.maxX));
  const minY = Math.min(...ready.map(result => result.tileRange.minY));
  const maxY = Math.max(...ready.map(result => result.tileRange.maxY));
  const width = (maxX - minX + 1) * TILE_SIZE;
  const height = (maxY - minY + 1) * TILE_SIZE;
  const sourceImages = [];
  for (const result of ready) {
    const mosaicPath = path.join(ROOT, result.mosaic.localPath);
    const source = await sharp(mosaicPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const canvas = Buffer.alloc(width * height * 4);
    const sourceWidth = source.info.width;
    const sourceHeight = source.info.height;
    const offsetX = (result.tileRange.minX - minX) * TILE_SIZE;
    const offsetY = (result.tileRange.minY - minY) * TILE_SIZE;
    for (let y = 0; y < sourceHeight; y += 1) {
      const sourceStart = y * sourceWidth * 4;
      const targetStart = ((y + offsetY) * width + offsetX) * 4;
      source.data.copy(canvas, targetStart, sourceStart, sourceStart + sourceWidth * 4);
    }
    sourceImages.push({ result, data: canvas });
  }
  const primary = sourceImages.filter(item => item.result.dataset.year === 1944 || item.result.dataset.year === 1945);
  const fallback = sourceImages.find(item => item.result.dataset.year === 1958);
  const outputRaw = Buffer.alloc(width * height * 4);
  const sourceMask = Buffer.alloc(width * height * 4);
  const counts = { 1944: 0, 1945: 0, 1958: 0, BASE: 0 };
  const tileSelection = new Map();
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const tileX = minX + Math.floor(x / TILE_SIZE);
    const tileY = minY + Math.floor(y / TILE_SIZE);
    const key = `${tileX}:${tileY}`;
    let candidates = tileSelection.get(key);
    if (!candidates) {
      candidates = primary.filter(item => item.result.tiles.some(tile => tile.x === tileX && tile.y === tileY && tile.status === 'READY')).sort((left, right) => {
        const leftTile = left.result.tiles.find(tile => tile.x === tileX && tile.y === tileY);
        const rightTile = right.result.tiles.find(tile => tile.x === tileX && tile.y === tileY);
        return (rightTile?.quality.normalizedScore ?? 0) - (leftTile?.quality.normalizedScore ?? 0);
      });
      tileSelection.set(key, candidates);
    }
    const pixelOffset = (y * width + x) * 4;
    let selected = candidates.find(item => item.data[pixelOffset + 3] > 8);
    if (!selected && fallback && fallback.data[pixelOffset + 3] > 8) selected = fallback;
    if (!selected) selected = sourceImages.find(item => item.data[pixelOffset + 3] > 8);
    const outputOffset = (y * width + x) * 4;
    if (!selected) {
      counts.BASE += 1;
      sourceMask[outputOffset] = 82; sourceMask[outputOffset + 1] = 82; sourceMask[outputOffset + 2] = 82; sourceMask[outputOffset + 3] = 255;
      continue;
    }
    outputRaw[outputOffset] = selected.data[outputOffset]; outputRaw[outputOffset + 1] = selected.data[outputOffset + 1]; outputRaw[outputOffset + 2] = selected.data[outputOffset + 2]; outputRaw[outputOffset + 3] = selected.data[outputOffset + 3];
    const year = selected.result.dataset.year;
    counts[year] += 1;
    const color = year === 1944 ? [196, 151, 84] : year === 1945 ? [104, 164, 150] : [171, 117, 177];
    sourceMask[outputOffset] = color[0]; sourceMask[outputOffset + 1] = color[1]; sourceMask[outputOffset + 2] = color[2]; sourceMask[outputOffset + 3] = 255;
  }
  const smartDir = path.join(output, 'smart');
  await mkdir(smartDir, { recursive: true });
  const smartPath = path.join(smartDir, `smart-composite-z${zoom}.png`);
  const maskPath = path.join(smartDir, `source-mask-z${zoom}.png`);
  await sharp(outputRaw, { raw: { width, height, channels: 4 } }).png().toFile(smartPath);
  await sharp(sourceMask, { raw: { width, height, channels: 4 } }).png().toFile(maskPath);
  const total = width * height;
  const compositeMosaicBounds = tileRangeBounds(minX, maxX, minY, maxY, zoom);
  return {
    status: 'READY',
    url: `/1949-guningtou/.local/aerial-poc/smart/smart-composite-z${zoom}.png`,
    sourceMaskUrl: `/1949-guningtou/.local/aerial-poc/smart/source-mask-z${zoom}.png`,
    width, height,
    bounds: compositeMosaicBounds,
    compositeMosaicBounds,
    tileRange: { z: zoom, minX, maxX, minY, maxY },
    distribution: Object.fromEntries(Object.entries(counts).map(([key, value]) => [key, Number(((value / Math.max(1, total)) * 100).toFixed(2))])),
    bytes: (await stat(smartPath)).size,
    selectionGranularity: 'tile',
    selectionPolicy: '1944/1945 primary by measured tile quality; 1958 only when primary is missing/transparent; modern DEM outside valid pixels',
  };
}

async function main() {
  const kmlDir = argument('--kml-dir', DEFAULT_KML_DIR);
  const output = path.resolve(argument('--output', DEFAULT_OUTPUT));
  const zoom = Math.max(8, Math.min(15, Number(argument('--zoom', DEFAULT_ZOOM)) || DEFAULT_ZOOM));
  const datasets = await readKmlDatasets(kmlDir);
  await mkdir(output, { recursive: true });
  const state = { totalTiles: 0, totalBytes: 0, lastRequestAt: 0 };
  const results = [];
  for (const dataset of datasets) results.push(await downloadDataset(dataset, AREA_BOUNDS, zoom, output, state));
  const qualityNormalization = normalizeQualitySet(results);
  const smart = await makeSmartComposite(results, output, zoom);
  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    localOnly: true,
    rightsStatus: 'BLOCKED — RIGHTS UNCLEAR',
    usageStatus: 'LOCAL POC — NOT REDISTRIBUTABLE',
    qualityNormalization: {
      method: 'metric-normalized quality set min-max across this local POC',
      minRawScore: qualityNormalization.minScore,
      maxRawScore: qualityNormalization.maxScore,
    },
    area: { id: 'GUNINGTOU_PRIORITY_WITH_EAST_CONTEXT', bounds: AREA_BOUNDS, label: '古寧頭優先／東半島 context／低中解析評估範圍' },
    request: { zoom, maxTiles: MAX_TILES, maxBytes: MAX_BYTES, coordinateOrder: 'XYZ', requestPolicy: `sequential / ${REQUEST_DELAY_MS}ms minimum delay / one request at a time` },
    datasets: results.map(result => ({
      id: result.dataset.id,
      name: result.dataset.name,
      year: result.dataset.year,
      date: result.dataset.year === 1958 ? '1958-09-10' : String(result.dataset.year),
      bounds: result.dataset.bounds,
      tileTemplate: result.dataset.tileTemplate,
      minLevel: result.dataset.minLevel,
      maxLevel: result.dataset.maxLevel,
      tileSize: result.dataset.tileSize,
      projection: result.dataset.projection,
      sourceKmlPath: result.dataset.sourceKmlPath,
      historicalRole: result.dataset.year === 1958 ? 'FALLBACK' : 'PRIMARY',
      rightsStatus: 'BLOCKED — RIGHTS UNCLEAR',
      status: result.status,
      bytes: result.bytes ?? 0,
      tileCount: result.tiles.length,
      readyTileCount: result.tiles.filter(tile => tile.status === 'READY').length,
      requestedTileRange: result.requestedTileRange,
      actualMosaicBounds: result.actualMosaicBounds,
      validPixelMask: result.validPixelMask,
      tileRange: result.tileRange,
      mosaic: result.mosaic,
      qualityMetadata: result.quality ?? { normalizedScore: 0, confidence: 'unmeasured', validPixelRatio: 0, alphaValidRatio: 0 },
      tiles: result.tiles.map(tile => ({ z: tile.z, x: tile.x, y: tile.y, status: tile.status, bytes: tile.bytes, quality: tile.quality })),
    })),
    smartComposite: smart,
    totals: { requestedTiles: state.totalTiles, downloadedBytes: state.totalBytes, withinBudget: state.totalTiles <= MAX_TILES && state.totalBytes <= MAX_BYTES },
  };
  const localManifest = path.join(output, 'manifest.json');
  await writeFile(localManifest, JSON.stringify(manifest, null, 2));
  const reportDir = path.join(ROOT, '.local', 'aerial-poc');
  await mkdir(reportDir, { recursive: true });
  await writeFile(path.join(reportDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify({ manifest: path.relative(ROOT, localManifest), totals: manifest.totals, datasets: manifest.datasets.map(dataset => ({ year: dataset.year, status: dataset.status, tileCount: dataset.tileCount, readyTileCount: dataset.readyTileCount, bytes: dataset.bytes, quality: dataset.qualityMetadata })) }, null, 2));
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
