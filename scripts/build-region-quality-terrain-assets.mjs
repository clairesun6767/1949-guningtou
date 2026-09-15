import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import zlib from 'node:zlib';

const AWS_TERRAIN_ROOT = 'https://s3.amazonaws.com/elevation-tiles-prod/skadi';
const DEFAULT_BOUNDS = { west: 117.97, south: 24.34, east: 118.58, north: 24.65 };
const DEFAULT_SOURCE_DIR = process.env.REGION_HGT_SOURCE_DIR;
const DEFAULT_RETRIEVED_AT = process.env.REGION_SOURCE_RETRIEVED_AT || '2026-09-15';

function argument(name) {
  const prefix = name + '=';
  const value = process.argv.find(item => item.startsWith(prefix));
  if (value) return value.slice(prefix.length);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function parseBounds(value) {
  if (!value) return DEFAULT_BOUNDS;
  const parts = value.split(',').map(Number);
  if (parts.length !== 4 || parts.some(item => !Number.isFinite(item))) {
    throw new Error('Bounds must be west,south,east,north.');
  }
  const [west, south, east, north] = parts;
  if (west >= east || south >= north) throw new Error('Requested bounds are invalid.');
  return { west, south, east, north };
}

function parseGrid(value, fallback) {
  if (!value) return fallback;
  const match = /^(\d+)x(\d+)$/i.exec(value);
  if (!match) throw new Error('Grid must be widthxheight.');
  const grid = { width: Number(match[1]), height: Number(match[2]) };
  if (grid.width < 2 || grid.height < 2) throw new Error('Grid must have at least two samples per axis.');
  return grid;
}

function parseMaskResolution(value) {
  const match = /^(\d+)x(\d+)$/i.exec(value || '2048x1041');
  if (!match) throw new Error('Coastline mask resolution must be widthxheight.');
  return { width: Number(match[1]), height: Number(match[2]) };
}

function tilePart(prefix, value, width) {
  return prefix + String(Math.abs(value)).padStart(width, '0');
}

function tileId(tileLatitude, tileLongitude) {
  return tilePart(tileLatitude >= 0 ? 'N' : 'S', tileLatitude, 2)
    + tilePart(tileLongitude >= 0 ? 'E' : 'W', tileLongitude, 3);
}

function tileUrl(tile) {
  const latitudeFolder = tilePart(tile.latitude >= 0 ? 'N' : 'S', tile.latitude, 2);
  return AWS_TERRAIN_ROOT + '/' + latitudeFolder + '/' + tile.id + '.hgt.gz';
}

function requiredTiles(bounds) {
  const tiles = [];
  for (let latitude = Math.floor(bounds.south); latitude <= Math.floor(bounds.north); latitude += 1) {
    for (let longitude = Math.floor(bounds.west); longitude <= Math.floor(bounds.east); longitude += 1) {
      const id = tileId(latitude, longitude);
      tiles.push({ id, latitude, longitude, url: tileUrl({ id, latitude, longitude }) });
    }
  }
  return tiles;
}

function locateSourcePath(sourceInput, tile) {
  if (!sourceInput) return undefined;
  const resolved = path.resolve(sourceInput);
  if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
    if (path.basename(resolved).toLowerCase() === (tile.id + '.hgt.gz').toLowerCase()) return resolved;
    return path.join(path.dirname(resolved), tile.id + '.hgt.gz');
  }
  return path.join(resolved, tile.id + '.hgt.gz');
}

async function resolveCompressedTile(tile, sourceInput, autoDownload) {
  const sourcePath = locateSourcePath(sourceInput, tile);
  if (sourcePath && fs.existsSync(sourcePath)) return { path: sourcePath, compressed: fs.readFileSync(sourcePath) };
  if (!autoDownload) {
    throw new Error('Missing required HGT tile ' + tile.id + '. Set REGION_HGT_SOURCE_DIR or pass --download to fetch it.');
  }
  const destination = sourcePath || path.join(process.env.TEMP || process.env.TMP || '.', tile.id + '.hgt.gz');
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const response = await fetch(tile.url, { headers: { 'User-Agent': '1949-Guningtou-Gate-A.2/1.0' } });
  if (!response.ok) throw new Error('HGT download failed for ' + tile.id + ': ' + response.status + ' ' + response.statusText);
  const compressed = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(destination, compressed);
  return { path: destination, compressed };
}

function loadTile(tile, resolved) {
  const raw = zlib.gunzipSync(resolved.compressed);
  const sampleCount = raw.length / 2;
  const side = Math.sqrt(sampleCount);
  if (!Number.isInteger(side) || side < 2) throw new Error('Unexpected HGT byte length for ' + tile.id + ': ' + raw.length);
  return {
    ...tile,
    path: resolved.path,
    compressedBytes: resolved.compressed.length,
    rawBytes: raw.length,
    sha256: crypto.createHash('sha256').update(resolved.compressed).digest('hex'),
    raw,
    side,
  };
}

function sourceSample(tile, row, column) {
  const safeRow = Math.max(0, Math.min(tile.side - 1, row));
  const safeColumn = Math.max(0, Math.min(tile.side - 1, column));
  const value = tile.raw.readInt16BE((safeRow * tile.side + safeColumn) * 2);
  return value === -32768 ? 0 : Math.max(0, value);
}

function sampleTile(tiles, latitude, longitude) {
  const tileLatitude = Math.floor(latitude);
  const tileLongitude = Math.floor(longitude);
  const id = tileId(tileLatitude, tileLongitude);
  const tile = tiles.get(id);
  if (!tile) throw new Error('No loaded HGT tile covers ' + latitude + ',' + longitude + ' (' + id + ').');
  const sourceColumn = Math.max(0, Math.min(tile.side - 1, (longitude - tileLongitude) * (tile.side - 1)));
  const sourceRow = Math.max(0, Math.min(tile.side - 1, (tileLatitude + 1 - latitude) * (tile.side - 1)));
  return { tile, sourceRow, sourceColumn };
}

function bilinearHgt(tiles, latitude, longitude) {
  const point = sampleTile(tiles, latitude, longitude);
  const row0 = Math.floor(point.sourceRow);
  const column0 = Math.floor(point.sourceColumn);
  const row1 = Math.min(point.tile.side - 1, row0 + 1);
  const column1 = Math.min(point.tile.side - 1, column0 + 1);
  const rowFraction = point.sourceRow - row0;
  const columnFraction = point.sourceColumn - column0;
  const northWest = sourceSample(point.tile, row0, column0);
  const northEast = sourceSample(point.tile, row0, column1);
  const southWest = sourceSample(point.tile, row1, column0);
  const southEast = sourceSample(point.tile, row1, column1);
  const north = northWest + (northEast - northWest) * columnFraction;
  const south = southWest + (southEast - southWest) * columnFraction;
  return Math.max(0, north + (south - north) * rowFraction);
}

function derive({ quality, id, grid, bounds, tiles, mask }) {
  const heights = new Array(grid.width * grid.height);
  for (let row = 0; row < grid.height; row += 1) {
    const latitude = bounds.north - (row / (grid.height - 1)) * (bounds.north - bounds.south);
    for (let column = 0; column < grid.width; column += 1) {
      const longitude = bounds.west + (column / (grid.width - 1)) * (bounds.east - bounds.west);
      heights[row * grid.width + column] = Math.round(bilinearHgt(tiles, latitude, longitude));
    }
  }
  let minElevationMetres = Number.POSITIVE_INFINITY;
  let maxElevationMetres = 0;
  for (const value of heights) {
    if (value <= 0) continue;
    minElevationMetres = Math.min(minElevationMetres, value);
    maxElevationMetres = Math.max(maxElevationMetres, value);
  }
  const sourceTiles = [...tiles.values()].map(tile => ({
    id: tile.id,
    sourceUrl: tile.url,
    sha256: tile.sha256,
    compressedBytes: tile.compressedBytes,
    rawBytes: tile.rawBytes,
    nativeGrid: tile.side + 'x' + tile.side,
    approximateNativeResolutionMetres: 30,
    latitudeTile: tile.latitude,
    longitudeTile: tile.longitude,
  }));
  const source = {
    id: 'mapzen-terrain-tiles-srtm-multi-hgt',
    title: 'Mapzen Terrain Tiles / SRTM multi-HGT regional source',
    sourceUrl: sourceTiles[0].sourceUrl,
    registryUrl: 'https://registry.opendata.aws/terrain-tiles/',
    attribution: 'Mapzen; SRTM data courtesy of the U.S. Geological Survey',
    acquiredAt: '2026-08-23',
    retrievedAt: DEFAULT_RETRIEVED_AT,
    nativeGrid: '3601x3601 per HGT tile',
    approximateNativeResolutionMetres: 30,
    temporalScope: 'modern geographic elevation reference; not a 1949 terrain reconstruction',
    tiles: sourceTiles,
  };
  return {
    schemaVersion: '1.2.0',
    id,
    quality,
    coordinateSystem: 'EPSG:4326',
    bounds,
    grid,
    elevationUnit: 'metre',
    source,
    derivation: {
      method: 'direct cross-tile bilinear sampling from native HGT tiles; ' + quality + ' is not an upsample of the 196x100 Gate A runtime asset',
      sourceGrid: sourceTiles.map(tile => tile.id + ' ' + tile.nativeGrid).join(', '),
      approximateSourceResolutionMetres: 30,
      sourceSampleInterpolation: 'bilinear across tile boundaries; nodata clamped to sea level; elevation values retained in metres',
      minElevationMetres: Number.isFinite(minElevationMetres) ? minElevationMetres : 0,
      maxElevationMetres,
      visualVerticalExaggerationAppliedAtRuntime: true,
      runtimeLandMask: 'High-resolution OpenStreetMap polygon mask is rendered independently from the DEM grid; no grid-step coastline is used.',
      coastlineResolution: mask.width + 'x' + mask.height + ' runtime alpha mask from regional OSM vector coastline',
      coastlineWidth: mask.width,
      coastlineHeight: mask.height,
    },
    heights,
  };
}

async function main() {
  const bounds = parseBounds(argument('--bounds') || process.env.REGION_REGION_BOUNDS);
  const sourceInput = argument('--source-dir') || DEFAULT_SOURCE_DIR || process.env.REGION_HGT_SOURCE;
  const autoDownload = process.argv.includes('--download') || process.env.REGION_HGT_AUTO_DOWNLOAD === '1';
  if (!sourceInput && !autoDownload) throw new Error('Usage: node scripts/build-region-quality-terrain-assets.mjs --source-dir <dir> --bounds <west,south,east,north> [--download]');
  const bGrid = parseGrid(argument('--grid-b') || process.env.REGION_QUALITY_B_GRID, { width: 512, height: 256 });
  const cGrid = parseGrid(argument('--grid-c') || process.env.REGION_QUALITY_C_GRID, { width: 1024, height: 512 });
  const mask = parseMaskResolution(argument('--coastline-mask') || process.env.REGION_COASTLINE_MASK);
  const outputPrefix = argument('--output-prefix') || process.env.REGION_TERRAIN_OUTPUT_PREFIX || 'kinmen-xiamen-regional';
  const requested = requiredTiles(bounds);
  const loaded = new Map();
  for (const tile of requested) {
    const resolved = await resolveCompressedTile(tile, sourceInput, autoDownload);
    const parsed = loadTile(tile, resolved);
    loaded.set(tile.id, parsed);
    process.stdout.write('Validated ' + tile.id + ': ' + parsed.side + 'x' + parsed.side + ', ' + parsed.compressedBytes.toLocaleString() + ' B gzip, SHA-256 ' + parsed.sha256 + '\n');
  }
  const assets = [
    derive({ quality: 'B', id: outputPrefix + '-quality-b', grid: bGrid, bounds, tiles: loaded, mask }),
    derive({ quality: 'C', id: outputPrefix + '-quality-c', grid: cGrid, bounds, tiles: loaded, mask }),
  ];
  const destination = path.resolve('public', 'terrain');
  fs.mkdirSync(destination, { recursive: true });
  for (const asset of assets) {
    const output = path.join(destination, asset.id + '.json');
    fs.writeFileSync(output, JSON.stringify(asset) + '\n');
    process.stdout.write(output + ': ' + asset.quality + ' ' + asset.grid.width + 'x' + asset.grid.height + ', ' + asset.derivation.minElevationMetres + '-' + asset.derivation.maxElevationMetres + ' m, ' + fs.statSync(output).size.toLocaleString() + ' bytes\n');
  }
  process.stdout.write('Requested bounds: ' + JSON.stringify(bounds) + '; HGT tiles: ' + requested.map(tile => tile.id).join(', ') + '\n');
}

await main();
