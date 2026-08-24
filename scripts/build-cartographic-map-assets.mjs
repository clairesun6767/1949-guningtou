import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const ACQUISITION_DATE = '2026-08-23';
const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';
const OUTPUT_DIR = new URL('../public/map-data/', import.meta.url);
const CACHE_DIR = join(tmpdir(), 'battlefield-os-cartography-v05');

const REGIONAL = { name: 'regional', south: 24.30, west: 117.95, north: 24.70, east: 118.60 };
const LOCAL = { name: 'guningtou', south: 24.44, west: 118.285, north: 24.50, east: 118.37 };

const SOURCE = {
  name: 'OpenStreetMap contributors',
  url: 'https://www.openstreetmap.org/copyright',
  license: 'Open Database License (ODbL) 1.0',
  acquired: ACQUISITION_DATE,
  referenceEra: 'modern_reference',
};

function bbox(bounds) {
  return `(${bounds.south},${bounds.west},${bounds.north},${bounds.east})`;
}

function query(bounds) {
  const box = bbox(bounds);
  return `[out:json][timeout:180];(
way["natural"="coastline"]${box};
way["landuse"~"^(farmland|orchard|forest|residential|commercial|industrial|meadow|grass|recreation_ground)$"]${box};
relation["landuse"~"^(farmland|orchard|forest|residential|commercial|industrial|meadow|grass|recreation_ground)$"]${box};
way["natural"~"^(wood|scrub|grassland|beach|sand)$"]${box};
relation["natural"~"^(wood|scrub|grassland|beach|sand)$"]${box};
way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential)$"]${box};
${bounds.name === 'guningtou' ? `way["building"]${box};` : ''}
);out tags geom;`;
}

async function fetchWithCache(bounds, refresh) {
  await mkdir(CACHE_DIR, { recursive: true });
  const cachePath = join(CACHE_DIR, `${bounds.name}-${ACQUISITION_DATE}.json`);
  if (!refresh) {
    try {
      return JSON.parse(await readFile(cachePath, 'utf8'));
    } catch {}
  }
  const url = `${OVERPASS_ENDPOINT}?data=${encodeURIComponent(query(bounds))}`;
  const response = await fetch(url, { headers: { 'User-Agent': 'BattlefieldOS-Cartography/0.5' } });
  if (!response.ok) throw new Error(`Overpass ${bounds.name} request failed: ${response.status} ${response.statusText}`);
  const data = await response.json();
  await writeFile(cachePath, `${JSON.stringify(data)}\n`, 'utf8');
  return data;
}

function coordinate(point) {
  return [Number(point.lon.toFixed(6)), Number(point.lat.toFixed(6))];
}

function samePoint(a, b, epsilon = 0.000002) {
  return Math.abs(a[0] - b[0]) <= epsilon && Math.abs(a[1] - b[1]) <= epsilon;
}

function stitch(lines) {
  const pending = lines.filter(line => line.length > 1).map(line => [...line]);
  const output = [];
  while (pending.length) {
    const chain = pending.pop();
    let changed = true;
    while (changed && !samePoint(chain[0], chain.at(-1))) {
      changed = false;
      for (let index = pending.length - 1; index >= 0; index -= 1) {
        const line = pending[index];
        if (samePoint(chain.at(-1), line[0])) chain.push(...line.slice(1));
        else if (samePoint(chain.at(-1), line.at(-1))) chain.push(...line.reverse().slice(1));
        else if (samePoint(chain[0], line.at(-1))) chain.unshift(...line.slice(0, -1));
        else if (samePoint(chain[0], line[0])) chain.unshift(...line.reverse().slice(0, -1));
        else continue;
        pending.splice(index, 1);
        changed = true;
        break;
      }
    }
    output.push(chain);
  }
  return output;
}

function perpendicularDistance(point, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (dx === 0 && dy === 0) return Math.hypot(point[0] - start[0], point[1] - start[1]);
  const t = Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point[0] - (start[0] + t * dx), point[1] - (start[1] + t * dy));
}

function simplify(points, tolerance) {
  if (points.length <= 2) return points;
  let maxDistance = 0;
  let split = 0;
  for (let index = 1; index < points.length - 1; index += 1) {
    const distance = perpendicularDistance(points[index], points[0], points.at(-1));
    if (distance > maxDistance) {
      maxDistance = distance;
      split = index;
    }
  }
  if (maxDistance <= tolerance) return [points[0], points.at(-1)];
  return [...simplify(points.slice(0, split + 1), tolerance).slice(0, -1), ...simplify(points.slice(split), tolerance)];
}

function ringArea(ring) {
  let area = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    area += ring[index][0] * ring[index + 1][1] - ring[index + 1][0] * ring[index][1];
  }
  return Math.abs(area / 2);
}

function clipAgainst(points, isInside, intersect) {
  const output = [];
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const previous = points[(index + points.length - 1) % points.length];
    const currentInside = isInside(current);
    const previousInside = isInside(previous);
    if (currentInside) {
      if (!previousInside) output.push(intersect(previous, current));
      output.push(current);
    } else if (previousInside) output.push(intersect(previous, current));
  }
  return output;
}

function clipPolygon(ring, bounds) {
  let points = ring.slice(0, samePoint(ring[0], ring.at(-1)) ? -1 : undefined);
  const vertical = value => (a, b) => [value, a[1] + (b[1] - a[1]) * ((value - a[0]) / (b[0] - a[0]))];
  const horizontal = value => (a, b) => [a[0] + (b[0] - a[0]) * ((value - a[1]) / (b[1] - a[1])), value];
  points = clipAgainst(points, point => point[0] >= bounds.west, vertical(bounds.west));
  points = clipAgainst(points, point => point[0] <= bounds.east, vertical(bounds.east));
  points = clipAgainst(points, point => point[1] >= bounds.south, horizontal(bounds.south));
  points = clipAgainst(points, point => point[1] <= bounds.north, horizontal(bounds.north));
  if (points.length < 3) return [];
  points.push(points[0]);
  return points.map(point => point.map(value => Number(value.toFixed(6))));
}

function clipSegment(a, b, bounds) {
  let t0 = 0;
  let t1 = 1;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const tests = [[-dx, a[0] - bounds.west], [dx, bounds.east - a[0]], [-dy, a[1] - bounds.south], [dy, bounds.north - a[1]]];
  for (const [p, q] of tests) {
    if (p === 0 && q < 0) return null;
    if (p === 0) continue;
    const ratio = q / p;
    if (p < 0) t0 = Math.max(t0, ratio);
    else t1 = Math.min(t1, ratio);
    if (t0 > t1) return null;
  }
  const at = t => [Number((a[0] + t * dx).toFixed(6)), Number((a[1] + t * dy).toFixed(6))];
  return [at(t0), at(t1)];
}

function clipLine(line, bounds) {
  const parts = [];
  let part = [];
  for (let index = 0; index < line.length - 1; index += 1) {
    const segment = clipSegment(line[index], line[index + 1], bounds);
    if (!segment) {
      if (part.length > 1) parts.push(part);
      part = [];
      continue;
    }
    if (!part.length || !samePoint(part.at(-1), segment[0])) {
      if (part.length > 1) parts.push(part);
      part = [segment[0]];
    }
    part.push(segment[1]);
  }
  if (part.length > 1) parts.push(part);
  return parts;
}

function geometriesFor(element) {
  if (element.type === 'way' && element.geometry) return [element.geometry.map(coordinate)];
  if (element.type !== 'relation') return [];
  return stitch((element.members ?? [])
    .filter(member => member.type === 'way' && member.role !== 'inner' && member.geometry)
    .map(member => member.geometry.map(coordinate)));
}

function classify(tags = {}) {
  const highway = tags.highway;
  if (highway) {
    if (['motorway', 'trunk', 'primary'].includes(highway)) return ['roads', 'road-primary'];
    if (['secondary', 'tertiary'].includes(highway)) return ['roads', 'road-secondary'];
    return ['roads', 'road-local'];
  }
  if (tags.building) return ['settlements', 'settlement-block'];
  if (tags.natural === 'beach' || tags.natural === 'sand') return ['beaches', 'beach'];
  if (tags.natural === 'wood' || tags.landuse === 'forest') return ['vegetation', 'forest'];
  if (['scrub', 'grassland'].includes(tags.natural) || ['grass', 'meadow', 'recreation_ground'].includes(tags.landuse)) return ['land-cover', 'open-ground'];
  if (['farmland', 'orchard'].includes(tags.landuse)) return ['land-cover', 'agriculture'];
  if (['residential', 'commercial', 'industrial'].includes(tags.landuse)) return ['settlements', 'settlement'];
  return null;
}

function featureProperties(element, layer, category) {
  return {
    id: `osm-${element.type}-${element.id}`,
    layer,
    category,
    name: element.tags?.name ?? element.tags?.['name:zh'] ?? null,
    referenceEra: 'modern_reference',
    source: 'OpenStreetMap contributors',
    license: 'ODbL-1.0',
  };
}

function buildCoastline(elements, bounds) {
  const coastLines = elements
    .filter(element => element.type === 'way' && element.tags?.natural === 'coastline' && element.geometry)
    .map(element => element.geometry.map(coordinate));
  const tolerance = bounds.name === 'regional' ? 0.00012 : 0.000025;
  const features = [];
  if (bounds.name === 'regional') {
    for (const chain of stitch(coastLines)) {
      if (!samePoint(chain[0], chain.at(-1))) continue;
      const clipped = clipPolygon(chain, bounds);
      if (clipped.length < 4 || ringArea(clipped) < 0.000003) continue;
      const simplified = simplify(clipped.slice(0, -1), tolerance);
      simplified.push(simplified[0]);
      features.push({
        type: 'Feature',
        properties: { id: `osm-coast-${features.length + 1}`, layer: 'coastline', category: 'land', referenceEra: 'modern_reference', source: SOURCE.name, license: 'ODbL-1.0' },
        geometry: { type: 'Polygon', coordinates: [simplified] },
      });
    }
  } else {
    const clippedChains = stitch(coastLines.flatMap(line => clipLine(line, bounds)))
      .filter(chain => chain.length > 3)
      .sort((a, b) => b.length - a.length);
    const northShore = clippedChains.find(chain => chain.some(point => point[1] > 24.47)) ?? clippedChains[0];
    if (!northShore) throw new Error('No local Guningtou coastline chain was produced.');
    const ordered = northShore[0][0] <= northShore.at(-1)[0] ? northShore : [...northShore].reverse();
    const simplified = simplify(ordered, tolerance);
    const ring = [
      ...simplified,
      [bounds.east, bounds.south],
      [bounds.west, bounds.south],
      simplified[0],
    ];
    features.push({
      type: 'Feature',
      properties: { id: 'osm-coast-guningtou-land', layer: 'coastline', category: 'land', referenceEra: 'modern_reference', source: SOURCE.name, license: 'ODbL-1.0' },
      geometry: { type: 'Polygon', coordinates: [ring] },
    });
  }
  return collection(features, bounds, 'High-resolution land polygons assembled from OSM mean-high-water coastline ways.');
}

function buildCartography(elements, bounds) {
  const tolerance = bounds.name === 'regional' ? 0.00024 : 0.000025;
  const roadTolerance = bounds.name === 'regional' ? 0.00016 : 0.000015;
  const minimumArea = bounds.name === 'regional' ? 0.0000015 : 0.000000015;
  const features = [];
  for (const element of elements) {
    const classification = classify(element.tags);
    if (!classification) continue;
    const [layer, category] = classification;
    for (const geometry of geometriesFor(element)) {
      if (layer === 'roads') {
        for (const part of clipLine(geometry, bounds)) {
          const coordinates = simplify(part, roadTolerance);
          if (coordinates.length < 2) continue;
          features.push({ type: 'Feature', properties: featureProperties(element, layer, category), geometry: { type: 'LineString', coordinates } });
        }
        continue;
      }
      if (geometry.length < 4 || !samePoint(geometry[0], geometry.at(-1))) continue;
      const ring = clipPolygon(geometry, bounds);
      const area = ringArea(ring);
      if (ring.length < 4 || (category !== 'beach' && area < minimumArea)) continue;
      const coordinates = simplify(ring.slice(0, -1), tolerance);
      if (coordinates.length < 3) continue;
      coordinates.push(coordinates[0]);
      features.push({ type: 'Feature', properties: { ...featureProperties(element, layer, category), sourceAreaDegrees: Number(area.toFixed(9)) }, geometry: { type: 'Polygon', coordinates: [coordinates] } });
    }
  }

  const limits = bounds.name === 'regional'
    ? { agriculture: 100, forest: 100, settlement: 100, 'open-ground': 50, beach: 50, 'road-primary': 220, 'road-secondary': 260, 'road-local': 0, 'settlement-block': 0 }
    : { agriculture: 320, forest: 240, settlement: 180, 'open-ground': 180, beach: 100, 'road-primary': 200, 'road-secondary': 500, 'road-local': 700, 'settlement-block': 650 };
  const retained = [];
  for (const [category, limit] of Object.entries(limits)) {
    if (!limit) continue;
    retained.push(...features
      .filter(feature => feature.properties.category === category)
      .sort((a, b) => (b.properties.sourceAreaDegrees ?? b.geometry.coordinates.length) - (a.properties.sourceAreaDegrees ?? a.geometry.coordinates.length))
      .slice(0, limit));
  }
  return collection(retained, bounds, 'Scale-filtered modern cartographic context; not a reconstruction of 1949 land use or buildings.');
}

function collection(features, bounds, note) {
  return {
    type: 'FeatureCollection',
    metadata: {
      version: '0.5',
      source: SOURCE,
      bounds: [bounds.west, bounds.south, bounds.east, bounds.north],
      scale: bounds.name === 'regional' ? 'regional strategic context' : 'local Guningtou visitor context',
      simplificationToleranceDegrees: bounds.name === 'regional' ? 0.00024 : 0.000025,
      note,
    },
    features,
  };
}

async function writeAsset(name, data) {
  const json = `${JSON.stringify(data)}\n`;
  await writeFile(new URL(name, OUTPUT_DIR), json, 'utf8');
  const raw = Buffer.byteLength(json);
  const gzip = gzipSync(json).byteLength;
  return { name, features: data.features.length, raw, gzip };
}

async function main() {
  const refresh = process.argv.includes('--refresh');
  await mkdir(OUTPUT_DIR, { recursive: true });
  const [regional, local] = await Promise.all([
    fetchWithCache(REGIONAL, refresh),
    fetchWithCache(LOCAL, refresh),
  ]);
  const results = [];
  results.push(await writeAsset('regional-coastline.geojson', buildCoastline(regional.elements, REGIONAL)));
  results.push(await writeAsset('guningtou-coastline.geojson', buildCoastline(local.elements, LOCAL)));
  results.push(await writeAsset('regional-cartography.geojson', buildCartography(regional.elements, REGIONAL)));
  results.push(await writeAsset('guningtou-cartography.geojson', buildCartography(local.elements, LOCAL)));
  for (const result of results) {
    console.log(`${result.name}: ${result.features} features, ${result.raw.toLocaleString()} B raw, ${result.gzip.toLocaleString()} B gzip`);
  }
  if (results.some(result => result.gzip > 500_000)) throw new Error('A cartographic payload exceeds the 500 KB gzip budget.');
}

await main();
