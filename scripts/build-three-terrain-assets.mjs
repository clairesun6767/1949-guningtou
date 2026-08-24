import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import zlib from 'node:zlib';

const sourcePath = process.argv[2];
if (!sourcePath) throw new Error('Usage: node scripts/build-three-terrain-assets.mjs <N24E118.hgt.gz>');

const raw = zlib.gunzipSync(fs.readFileSync(sourcePath));
const sampleCount = raw.length / 2;
const side = Math.sqrt(sampleCount);
if (!Number.isInteger(side)) throw new Error(`Unexpected HGT byte length: ${raw.length}`);

const source = {
  id: 'mapzen-terrain-tiles-srtm-n24e118',
  title: 'Mapzen Terrain Tiles / SRTM N24E118',
  sourceUrl: 'https://s3.amazonaws.com/elevation-tiles-prod/skadi/N24/N24E118.hgt.gz',
  registryUrl: 'https://registry.opendata.aws/terrain-tiles/',
  attribution: 'Mapzen; SRTM data courtesy of the U.S. Geological Survey',
  acquiredAt: '2026-08-23',
  nativeGrid: `${side}x${side}`,
  approximateNativeResolutionMetres: 30,
  temporalScope: 'modern geographic elevation reference; not a 1949 terrain reconstruction',
};

function hgt(latitude, longitude) {
  const x = Math.max(0, Math.min(side - 1, Math.round((longitude - 118) * (side - 1))));
  const y = Math.max(0, Math.min(side - 1, Math.round((25 - latitude) * (side - 1))));
  const value = raw.readInt16BE((y * side + x) * 2);
  return value === -32768 ? 0 : Math.max(0, value);
}

function derive({ id, bounds, width, height, landNeighbourRadius, seaConnectivityEdge }) {
  const [west, south, east, north] = bounds;
  const sourceHeights = [];
  for (let row = 0; row < height; row += 1) {
    const latitude = north - (row / (height - 1)) * (north - south);
    for (let column = 0; column < width; column += 1) {
      const longitude = west + (column / (width - 1)) * (east - west);
      sourceHeights.push(Math.round(hgt(latitude, longitude)));
    }
  }

  let land;
  if (seaConnectivityEdge === 'north-envelope') {
    const frontier = [];
    for (let column = 0; column < width; column += 1) {
      let firstLand = height;
      for (let row = 0; row < height; row += 1) {
        if (sourceHeights[row * width + column] > 0) {
          firstLand = row;
          break;
        }
      }
      frontier.push(firstLand);
    }
    const smoothedFrontier = frontier.map((_, column) => {
      const values = frontier.slice(Math.max(0, column - 2), Math.min(width, column + 3)).sort((a, b) => a - b);
      return values[Math.floor(values.length / 2)];
    });
    land = sourceHeights.map((_, index) => {
      const row = Math.floor(index / width);
      const column = index % width;
      return row >= Math.max(0, smoothedFrontier[column] - 1) ? 1 : 0;
    });
  } else if (seaConnectivityEdge === 'north') {
    const sea = new Uint8Array(sourceHeights.length);
    const queue = [];
    for (let column = 0; column < width; column += 1) {
      if (sourceHeights[column] === 0) {
        sea[column] = 1;
        queue.push(column);
      }
    }
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const index = queue[cursor];
      const row = Math.floor(index / width);
      const column = index % width;
      for (const [dy, dx] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nextRow = row + dy;
        const nextColumn = column + dx;
        if (nextRow < 0 || nextRow >= height || nextColumn < 0 || nextColumn >= width) continue;
        const next = nextRow * width + nextColumn;
        if (!sea[next] && sourceHeights[next] === 0) {
          sea[next] = 1;
          queue.push(next);
        }
      }
    }
    land = sourceHeights.map((_, index) => sea[index] ? 0 : 1);
  } else {
    land = sourceHeights.map((heightValue, index) => {
      if (heightValue > 0) return 1;
      const row = Math.floor(index / width);
      const column = index % width;
      for (let dy = -landNeighbourRadius; dy <= landNeighbourRadius; dy += 1) {
        for (let dx = -landNeighbourRadius; dx <= landNeighbourRadius; dx += 1) {
          const nextRow = row + dy;
          const nextColumn = column + dx;
          if (nextRow < 0 || nextRow >= height || nextColumn < 0 || nextColumn >= width) continue;
          if (sourceHeights[nextRow * width + nextColumn] > 0) return 1;
        }
      }
      return 0;
    });
  }

  const heights = sourceHeights.map((heightValue, index) => {
    if (heightValue > 0 || !land[index]) return heightValue;
    const row = Math.floor(index / width);
    const column = index % width;
    for (let radius = 1; radius <= Math.max(landNeighbourRadius, 20); radius += 1) {
      const neighbours = [];
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
          const nextRow = row + dy;
          const nextColumn = column + dx;
          if (nextRow < 0 || nextRow >= height || nextColumn < 0 || nextColumn >= width) continue;
          const value = sourceHeights[nextRow * width + nextColumn];
          if (value > 0) neighbours.push(value);
        }
      }
      if (neighbours.length) return Math.min(...neighbours);
    }
    return 1;
  });

  const positive = heights.filter(value => value > 0);
  return {
    schemaVersion: '1.0.0',
    id,
    coordinateSystem: 'EPSG:4326',
    bounds: { west, south, east, north },
    grid: { width, height },
    elevationUnit: 'metre',
    source,
    derivation: {
      method: seaConnectivityEdge === 'north-envelope'
        ? 'nearest-neighbour downsample from 1-arc-second HGT; local north-facing coastline is a five-column median envelope of the first positive source elevation; enclosed zero values use the nearest lowest positive source neighbour'
        : seaConnectivityEdge === 'north'
        ? 'nearest-neighbour downsample from 1-arc-second HGT; open sea is the zero-elevation component connected to the north crop edge; enclosed zero values use the nearest lowest positive source neighbour'
        : `nearest-neighbour downsample from 1-arc-second HGT; sea mask is source elevation > 0 with ${landNeighbourRadius}-cell coastal closure; closed zero values use the lowest positive source neighbour`,
      landNeighbourRadius,
      seaConnectivityEdge: seaConnectivityEdge ?? null,
      minElevationMetres: positive.length ? Math.min(...positive) : 0,
      maxElevationMetres: positive.length ? Math.max(...positive) : 0,
      visualVerticalExaggerationAppliedAtRuntime: true,
      runtimeLandMask: 'V0.5 ignores this compatibility land array and uses the independent OpenStreetMap coastline mask.',
    },
    heights,
    land,
  };
}

const assets = [
  derive({ id: 'kinmen-xiamen-regional', bounds: [117.97, 24.34, 118.58, 24.65], width: 196, height: 100, landNeighbourRadius: 1 }),
  derive({ id: 'guningtou-local', bounds: [118.285, 24.44, 118.37, 24.5], width: 320, height: 256, landNeighbourRadius: 4, seaConnectivityEdge: 'north-envelope' }),
];

const destination = path.resolve('public', 'terrain');
fs.mkdirSync(destination, { recursive: true });
for (const asset of assets) {
  const output = path.join(destination, `${asset.id}.json`);
  fs.writeFileSync(output, `${JSON.stringify(asset)}\n`);
  process.stdout.write(`${output}: ${asset.grid.width}x${asset.grid.height}, ${asset.derivation.minElevationMetres}-${asset.derivation.maxElevationMetres} m\n`);
}
