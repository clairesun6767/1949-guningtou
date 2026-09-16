import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const OUTPUT = path.join(ROOT, '.local', 'aerial-poc');
const MANIFEST_PATH = path.join(OUTPUT, 'guningtou-higher-zoom-manifest.json');
const TARGET = { longitude: 118.318, latitude: 24.478 };
const ZOOMS = [15, 16, 17];
const YEARS = [1944, 1945, 1958];
const TILE_SIZE = 256;
const COLUMNS = 2;
const ROWS = 2;
const MAX_TILES_PER_ZOOM = 16;
const REQUEST_DELAY_MS = 250;
const MAX_BYTES_TOTAL = 10 * 1024 * 1024;
const BASE_MANIFEST_PATH = path.join(OUTPUT, 'manifest.json');

function clampLatitude(latitude) {
  return Math.max(-85.05112878, Math.min(85.05112878, latitude));
}

function lonLatToXyzTile(longitude, latitude, z) {
  const scale = 2 ** z;
  const radians = (clampLatitude(latitude) * Math.PI) / 180;
  return {
    z,
    x: Math.max(0, Math.min(scale - 1, Math.floor(((longitude + 180) / 360) * scale))),
    y: Math.max(0, Math.min(scale - 1, Math.floor(((1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2) * scale))),
  };
}

function tileRangeAroundTarget(z) {
  const center = lonLatToXyzTile(TARGET.longitude, TARGET.latitude, z);
  const scale = 2 ** z;
  const minX = Math.max(0, Math.min(scale - COLUMNS, center.x - Math.floor(COLUMNS / 2)));
  const minY = Math.max(0, Math.min(scale - ROWS, center.y - Math.floor(ROWS / 2)));
  return {
    z,
    minX,
    maxX: Math.min(scale - 1, minX + COLUMNS - 1),
    minY,
    maxY: Math.min(scale - 1, minY + ROWS - 1),
  };
}

function tileBounds(z, x, y) {
  const scale = 2 ** z;
  const west = (x / scale) * 360 - 180;
  const east = ((x + 1) / scale) * 360 - 180;
  const north = (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / scale))) * 180) / Math.PI;
  const south = (Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / scale))) * 180) / Math.PI;
  return { west, south, east, north };
}

function rangeBounds(range) {
  const northWest = tileBounds(range.z, range.minX, range.minY);
  const southEast = tileBounds(range.z, range.maxX, range.maxY);
  return {
    west: northWest.west,
    south: southEast.south,
    east: southEast.east,
    north: northWest.north,
  };
}

function tilesForRange(range) {
  const tiles = [];
  for (let x = range.minX; x <= range.maxX; x += 1) {
    for (let y = range.minY; y <= range.maxY; y += 1) tiles.push({ z: range.z, x, y });
  }
  return tiles;
}

function expandTemplate(template, tile) {
  return template
    .replace(/\{\{z\}\}/g, String(tile.z))
    .replace(/\{\{x\}\}/g, String(tile.x))
    .replace(/\{\{y\}\}/g, String(tile.y));
}

function isPlaceholder(bytes, contentType) {
  const data = new Uint8Array(bytes);
  const type = (contentType ?? '').toLowerCase();
  if (type.includes('text/html') || type.includes('application/json')) return true;
  if (type.includes('gif') && data.length <= 256) return true;
  if (data.length <= 128) return true;
  return data.length >= 10
    && data[0] === 0x47
    && data[1] === 0x49
    && data[2] === 0x46
    && data[6] === 1
    && data[7] === 0
    && data[8] === 1
    && data[9] === 0;
}

function qualityFromRaw(raw, width, height, channels = 4) {
  let valid = 0;
  let sum = 0;
  let sumSquare = 0;
  let edgeSum = 0;
  let edgeCount = 0;
  const luminanceAt = (x, y) => {
    const offset = (y * width + x) * channels;
    return ((raw[offset] ?? 0) * 0.2126
      + (raw[offset + Math.min(1, channels - 1)] ?? 0) * 0.7152
      + (raw[offset + Math.min(2, channels - 1)] ?? 0) * 0.0722) / 255;
  };
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * channels;
      const alpha = channels >= 4 ? raw[offset + 3] ?? 255 : 255;
      if (alpha <= 8) continue;
      const luminance = luminanceAt(x, y);
      valid += 1;
      sum += luminance;
      sumSquare += luminance * luminance;
      if (x > 0 && y > 0 && x < width - 1 && y < height - 1) {
        const center = luminance;
        const laplacian = Math.abs(
          luminanceAt(x - 1, y) + luminanceAt(x + 1, y)
          + luminanceAt(x, y - 1) + luminanceAt(x, y + 1)
          - center * 4,
        );
        edgeSum += laplacian;
        edgeCount += 1;
      }
    }
  }
  const mean = valid ? sum / valid : 0;
  const variance = valid ? Math.max(0, sumSquare / valid - mean * mean) : 0;
  const validPixelRatio = valid / Math.max(1, width * height);
  const contrast = Math.min(1, Math.sqrt(variance) * 2.8);
  const edgeDetail = Math.min(1, (edgeSum / Math.max(1, edgeCount)) * 3.2);
  return {
    validPixelRatio,
    contrast,
    edgeDetail,
    detailScore: edgeDetail * 0.58 + contrast * 0.27 + validPixelRatio * 0.15,
    confidence: 'measured-local-poc',
  };
}

async function loadSourceDatasets() {
  const manifest = JSON.parse(await readFile(BASE_MANIFEST_PATH, 'utf8'));
  const byYear = new Map(manifest.datasets.map(dataset => [dataset.year, dataset]));
  for (const year of YEARS) {
    if (!byYear.has(year)) throw new Error('Base manifest has no dataset for ' + year);
  }
  return byYear;
}

async function downloadZoomDataset(dataset, year, zoom, range, state) {
  const requestedTiles = tilesForRange(range);
  const datasetRoot = path.join(OUTPUT, 'guningtou', String(year), 'z' + zoom);
  const tileRecords = [];
  const readyBuffers = [];
  let downloadedBytes = 0;

  for (const tile of requestedTiles) {
    if (state.totalTiles >= ZOOMS.length * YEARS.length * COLUMNS * ROWS) {
      throw new Error('Higher-zoom tile budget exceeded.');
    }
    const url = expandTemplate(dataset.tileTemplate, tile);
    const waitMs = Math.max(0, REQUEST_DELAY_MS - (Date.now() - state.lastRequestAt));
    if (waitMs) await new Promise(resolve => setTimeout(resolve, waitMs));
    state.lastRequestAt = Date.now();
    const response = await fetch(url, {
      headers: {
        accept: 'image/png,image/*;q=0.8,*/*;q=0.1',
        'user-agent': '1949-Guningtou-Gate-A.3P.2b-local-poc',
      },
    });
    const buffer = new Uint8Array(await response.arrayBuffer());
    state.totalTiles += 1;
    state.totalBytes += buffer.byteLength;
    downloadedBytes += buffer.byteLength;
    if (state.totalBytes > MAX_BYTES_TOTAL) throw new Error('Higher-zoom byte budget exceeded.');

    let metadata;
    try {
      metadata = await sharp(buffer).metadata();
    } catch {
      metadata = undefined;
    }
    const ready = Boolean(
      response.ok
      && !isPlaceholder(buffer, response.headers.get('content-type'))
      && metadata?.width
      && metadata?.height,
    );
    const record = {
      z: tile.z,
      x: tile.x,
      y: tile.y,
      bounds: tileBounds(tile.z, tile.x, tile.y),
      endpoint: url,
      httpStatus: response.status,
      contentType: response.headers.get('content-type'),
      status: ready ? 'READY' : 'MISSING_OR_PLACEHOLDER',
      bytes: buffer.byteLength,
      width: ready ? metadata.width : null,
      height: ready ? metadata.height : null,
    };
    if (ready) {
      const tilePath = path.join(datasetRoot, 'tiles', String(tile.x), tile.y + '.png');
      await mkdir(path.dirname(tilePath), { recursive: true });
      await writeFile(tilePath, buffer);
      record.localPath = path.relative(ROOT, tilePath).replaceAll('\\', '/');
      readyBuffers.push({ record, buffer });
    }
    tileRecords.push(record);
  }

  const readyTileCount = readyBuffers.length;
  if (!readyTileCount) {
    return {
      id: dataset.id,
      year,
      bounds: dataset.bounds,
      status: 'NO VALID PIXELS',
      tileCount: requestedTiles.length,
      readyTileCount,
      missingTileCount: requestedTiles.length,
      downloadedBytes,
      requestedTileRange: range,
      actualMosaicBounds: undefined,
      qualityMetadata: { detailScore: 0, validPixelRatio: 0, confidence: 'unmeasured' },
      tiles: tileRecords,
    };
  }

  const width = (range.maxX - range.minX + 1) * TILE_SIZE;
  const height = (range.maxY - range.minY + 1) * TILE_SIZE;
  const composites = readyBuffers.map(({ record, buffer }) => ({
    input: buffer,
    left: (record.x - range.minX) * TILE_SIZE,
    top: (record.y - range.minY) * TILE_SIZE,
  }));
  const mosaicPath = path.join(datasetRoot, 'mosaic.png');
  await mkdir(datasetRoot, { recursive: true });
  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite(composites).png().toFile(mosaicPath);

  const mosaicRaw = await sharp(mosaicPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const qualityMetadata = qualityFromRaw(
    mosaicRaw.data,
    mosaicRaw.info.width,
    mosaicRaw.info.height,
    mosaicRaw.info.channels,
  );
  const mask = Buffer.alloc(width * height);
  for (let index = 0; index < width * height; index += 1) {
    mask[index] = (mosaicRaw.data[index * mosaicRaw.info.channels + 3] ?? 0) > 8 ? 255 : 0;
  }
  const maskPath = path.join(datasetRoot, 'valid-mask.png');
  await sharp(mask, { raw: { width, height, channels: 1 } }).png().toFile(maskPath);
  const bounds = rangeBounds(range);
  const mosaicBytes = (await stat(mosaicPath)).size;
  const maskBytes = (await stat(maskPath)).size;
  return {
    id: dataset.id,
    year,
    bounds: dataset.bounds,
    status: 'READY',
    tileCount: requestedTiles.length,
    readyTileCount,
    missingTileCount: requestedTiles.length - readyTileCount,
    downloadedBytes,
    requestedTileRange: range,
    actualMosaicBounds: bounds,
    qualityMetadata,
    mosaic: {
      localPath: path.relative(ROOT, mosaicPath).replaceAll('\\', '/'),
      url: '/1949-guningtou/.local/aerial-poc/guningtou/' + year + '/z' + zoom + '/mosaic.png',
      width,
      height,
      bytes: mosaicBytes,
      bounds,
      actualMosaicBounds: bounds,
      tileRange: range,
      validPixelMask: {
        localPath: path.relative(ROOT, maskPath).replaceAll('\\', '/'),
        url: '/1949-guningtou/.local/aerial-poc/guningtou/' + year + '/z' + zoom + '/valid-mask.png',
        width,
        height,
        bytes: maskBytes,
        encoding: 'alpha>8',
      },
    },
    tiles: tileRecords,
  };
}

async function main() {
  const sourceDatasets = await loadSourceDatasets();
  await mkdir(OUTPUT, { recursive: true });
  const state = { totalTiles: 0, totalBytes: 0, lastRequestAt: 0 };
  const zoomEntries = {};
  for (const zoom of ZOOMS) {
    const range = tileRangeAroundTarget(zoom);
    const tiles = tilesForRange(range);
    if (tiles.length > MAX_TILES_PER_ZOOM) throw new Error('Zoom ' + zoom + ' exceeds the 16-tile limit.');
    const tileSize = tileBounds(zoom, tiles[0].x, tiles[0].y);
    const datasets = [];
    for (const year of YEARS) {
      datasets.push(await downloadZoomDataset(sourceDatasets.get(year), year, zoom, range, state));
    }
    zoomEntries[String(zoom)] = {
      zoom,
      tileRange: range,
      bounds: rangeBounds(range),
      tileCount: tiles.length,
      tileGeographicSize: {
        longitudeDegrees: tileSize.east - tileSize.west,
        latitudeDegrees: tileSize.north - tileSize.south,
      },
      datasets,
      totals: {
        requestedTiles: datasets.reduce((sum, dataset) => sum + dataset.tileCount, 0),
        downloadedBytes: datasets.reduce((sum, dataset) => sum + dataset.downloadedBytes, 0),
        validTiles: datasets.reduce((sum, dataset) => sum + dataset.readyTileCount, 0),
        missingTiles: datasets.reduce((sum, dataset) => sum + dataset.missingTileCount, 0),
      },
    };
  }

  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    localOnly: true,
    rightsStatus: 'BLOCKED — RIGHTS UNCLEAR',
    usageStatus: 'LOCAL POC — NOT REDISTRIBUTABLE',
    purpose: 'GATE A.3P.2b — HIGHER-ZOOM GUNINGTOU GEOREFERENCE VALIDATION',
    target: TARGET,
    landmarkReview: 'Existing modern/reference candidates only; not historical GCPs and not proof of orthorectification.',
    request: {
      zooms: ZOOMS,
      maxTilesPerZoom: MAX_TILES_PER_ZOOM,
      coordinateOrder: 'XYZ',
      tileWindow: '2×2 exact tile union around the existing Guningtou preset target',
      perZoomRequestedTiles: COLUMNS * ROWS * YEARS.length,
      noSmartComposite: true,
      sequentialDelayMs: REQUEST_DELAY_MS,
    },
    zooms: zoomEntries,
    totals: {
      requestedTiles: state.totalTiles,
      downloadedBytes: state.totalBytes,
      withinBudget: state.totalTiles <= ZOOMS.length * MAX_TILES_PER_ZOOM && state.totalBytes <= MAX_BYTES_TOTAL,
    },
  };
  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({
    manifest: path.relative(ROOT, MANIFEST_PATH).replaceAll('\\', '/'),
    totals: manifest.totals,
    zooms: Object.values(zoomEntries).map(entry => ({
      zoom: entry.zoom,
      tileCount: entry.tileCount,
      requestedTiles: entry.totals.requestedTiles,
      downloadedBytes: entry.totals.downloadedBytes,
      validTiles: entry.totals.validTiles,
      missingTiles: entry.totals.missingTiles,
    })),
  }, null, 2));
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
