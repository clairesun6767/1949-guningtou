import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import zlib from 'node:zlib';

const sourcePath = process.argv[2] ?? process.env.REGION_HGT_SOURCE;
if (!sourcePath) throw new Error('Usage: node scripts/build-region-quality-terrain-assets.mjs <N24E118.hgt.gz>');

const compressed = fs.readFileSync(sourcePath);
const raw = zlib.gunzipSync(compressed);
const sampleCount = raw.length / 2;
const side = Math.sqrt(sampleCount);
if (!Number.isInteger(side)) throw new Error(`Unexpected HGT byte length: ${raw.length}`);

const sourceHash = crypto.createHash('sha256').update(compressed).digest('hex');
const retrievedAt = process.env.REGION_SOURCE_RETRIEVED_AT ?? '2026-09-15';
const source = {
  id: 'mapzen-terrain-tiles-srtm-n24e118',
  title: 'Mapzen Terrain Tiles / SRTM N24E118',
  sourceUrl: 'https://s3.amazonaws.com/elevation-tiles-prod/skadi/N24/N24E118.hgt.gz',
  registryUrl: 'https://registry.opendata.aws/terrain-tiles/',
  attribution: 'Mapzen; SRTM data courtesy of the U.S. Geological Survey',
  acquiredAt: '2026-08-23',
  retrievedAt,
  downloadSha256: sourceHash,
  nativeGrid: `${side}x${side}`,
  approximateNativeResolutionMetres: 30,
  temporalScope: 'modern geographic elevation reference; not a 1949 terrain reconstruction',
};

function sourceSample(row, column) {
  const x = Math.max(0, Math.min(side - 1, column));
  const y = Math.max(0, Math.min(side - 1, row));
  const value = raw.readInt16BE((y * side + x) * 2);
  return value === -32768 ? 0 : Math.max(0, value);
}

function bilinearHgt(latitude, longitude) {
  const sourceColumn = Math.max(0, Math.min(side - 1, (longitude - 118) * (side - 1)));
  const sourceRow = Math.max(0, Math.min(side - 1, (25 - latitude) * (side - 1)));
  const column0 = Math.floor(sourceColumn);
  const row0 = Math.floor(sourceRow);
  const column1 = Math.min(side - 1, column0 + 1);
  const row1 = Math.min(side - 1, row0 + 1);
  const columnFraction = sourceColumn - column0;
  const rowFraction = sourceRow - row0;
  const northWest = sourceSample(row0, column0);
  const northEast = sourceSample(row0, column1);
  const southWest = sourceSample(row1, column0);
  const southEast = sourceSample(row1, column1);
  const north = northWest + (northEast - northWest) * columnFraction;
  const south = southWest + (southEast - southWest) * columnFraction;
  return Math.max(0, north + (south - north) * rowFraction);
}

function derive({ quality, id, width, height }) {
  const [west, south, east, north] = [117.97, 24.34, 118.58, 24.65];
  const heights = [];
  for (let row = 0; row < height; row += 1) {
    const latitude = north - (row / (height - 1)) * (north - south);
    for (let column = 0; column < width; column += 1) {
      const longitude = west + (column / (width - 1)) * (east - west);
      heights.push(Math.round(bilinearHgt(latitude, longitude)));
    }
  }

  const positive = heights.filter(value => value > 0);
  const minimum = positive.reduce((value, next) => Math.min(value, next), Number.POSITIVE_INFINITY);
  const maximum = positive.reduce((value, next) => Math.max(value, next), 0);
  return {
    schemaVersion: '1.1.0',
    id,
    quality,
    coordinateSystem: 'EPSG:4326',
    bounds: { west, south, east, north },
    grid: { width, height },
    elevationUnit: 'metre',
    source,
    derivation: {
      method: `direct bilinear sampling from the native ${side}x${side} 1-arc-second HGT; ${quality} is not an upsample of the 196x100 Gate A runtime asset`,
      sourceGrid: `${side}x${side}`,
      approximateSourceResolutionMetres: 30,
      sourceSampleInterpolation: 'bilinear; nodata clamped to sea level; elevation values retained in metres',
      minElevationMetres: positive.length ? minimum : 0,
      maxElevationMetres: maximum,
      visualVerticalExaggerationAppliedAtRuntime: true,
      runtimeLandMask: 'High-resolution OpenStreetMap polygon mask is rendered independently from the DEM grid; no grid-step coastline is used.',
      coastlineResolution: '2048x1041 runtime alpha mask from regional OSM vector coastline',
    },
    heights,
  };
}

const assets = [
  derive({ quality: 'B', id: 'kinmen-xiamen-regional-quality-b', width: 512, height: 256 }),
  derive({ quality: 'C', id: 'kinmen-xiamen-regional-quality-c', width: 1024, height: 512 }),
];

const destination = path.resolve('public', 'terrain');
fs.mkdirSync(destination, { recursive: true });
for (const asset of assets) {
  const output = path.join(destination, `${asset.id}.json`);
  fs.writeFileSync(output, `${JSON.stringify(asset)}\n`);
  process.stdout.write(`${output}: ${asset.quality} ${asset.grid.width}x${asset.grid.height}, ${asset.derivation.minElevationMetres}-${asset.derivation.maxElevationMetres} m, ${fs.statSync(output).size} bytes\n`);
}
