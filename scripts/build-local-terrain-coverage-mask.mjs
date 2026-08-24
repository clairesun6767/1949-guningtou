import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const terrainPath = path.join(root, 'public', 'terrain', 'guningtou-local.json');
const coastlinePath = path.join(root, 'public', 'map-data', 'guningtou-coastline.geojson');
const outputPath = path.join(root, 'public', 'terrain', 'guningtou-local-coverage-mask.json');

function pointInRing(point, ring) {
  const [longitude, latitude] = point;
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [x, y] = ring[index];
    const [previousX, previousY] = ring[previous];
    const intersects = ((y > latitude) !== (previousY > latitude))
      && longitude < ((previousX - x) * (latitude - y)) / ((previousY - y) || Number.EPSILON) + x;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInPolygon(point, rings) {
  if (!rings.length || !pointInRing(point, rings[0])) return false;
  return !rings.slice(1).some(ring => pointInRing(point, ring));
}

function pointInLand(point, features) {
  return features.some(feature => {
    if (feature.geometry.type === 'Polygon') return pointInPolygon(point, feature.geometry.coordinates);
    if (feature.geometry.type === 'MultiPolygon') return feature.geometry.coordinates.some(polygon => pointInPolygon(point, polygon));
    return false;
  });
}

const asset = JSON.parse(await fs.readFile(terrainPath, 'utf8'));
const coastline = JSON.parse(await fs.readFile(coastlinePath, 'utf8'));
const values = [];
let validSampleCount = 0;
for (let row = 0; row < asset.grid.height; row += 1) {
  const latitude = asset.bounds.north - (row / (asset.grid.height - 1)) * (asset.bounds.north - asset.bounds.south);
  for (let column = 0; column < asset.grid.width; column += 1) {
    const longitude = asset.bounds.west + (column / (asset.grid.width - 1)) * (asset.bounds.east - asset.bounds.west);
    const index = row * asset.grid.width + column;
    const finiteDem = Number.isFinite(asset.heights[index]);
    const demLand = asset.land[index] === 1;
    const coastlineLand = pointInLand([longitude, latitude], coastline.features);
    const valid = finiteDem && demLand && coastlineLand ? 1 : 0;
    values.push(valid);
    validSampleCount += valid;
  }
}

const mask = {
  schemaVersion: '0.8.0',
  assetId: 'guningtou-local-coverage',
  coordinateSystem: asset.coordinateSystem,
  bounds: asset.bounds,
  grid: asset.grid,
  values,
  validSampleCount,
  method: 'local DEM finite samples ∩ OSM renderable land polygon',
  referenceEra: 'modern_reference',
  note: 'Explicit local terrain coverage mask. It is queried for terrain ownership; no rectangular bounding-box exclusion is used.',
};
await fs.writeFile(outputPath, JSON.stringify(mask) + '\n', 'utf8');
console.log('Wrote ' + outputPath + ' (' + validSampleCount + '/' + values.length + ' valid samples)');
