import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  HistoricalAerialKmlParser,
  historicalAerialBoundsContain,
  historicalAerialBoundsOverlap,
} from '../../.tmp/v2-tests/v2/shared/historicalAerialDataset.js';
import {
  HISTORICAL_AERIAL_DATASETS,
  HISTORICAL_AERIAL_YEARS,
  HISTORICAL_AERIAL_KML_PATHS,
  getHistoricalAerialDataset,
  validateHistoricalAerialRegistry,
} from '../../.tmp/v2-tests/v2/config/historicalAerialRegistry.js';
import {
  analyzeHistoricalAerialPixels,
  normalizeHistoricalAerialQualitySet,
} from '../../.tmp/v2-tests/v2/shared/historicalAerialQuality.js';
import {
  createHistoricalAerialSourceMask,
  getHistoricalAerialSourceAt,
} from '../../.tmp/v2-tests/v2/shared/historicalAerialSelection.js';
import {
  HISTORICAL_AERIAL_DOWNLOAD_BUDGET,
  enumerateHistoricalAerialTiles,
  estimateTileBudget,
  expandHistoricalAerialTileTemplate,
  isLikelyPlaceholderTile,
  lonLatToXyzTile,
  tileBounds,
  tileYForOrder,
  validateHistoricalAerialTileRequest,
} from '../../.tmp/v2-tests/v2/shared/historicalAerialTiles.js';
import {
  geographicToAerialUV,
  outsideBoundsReturnsBase,
  smartCompositeUsesCommonGeographicGrid,
  tileRangeToBounds,
  tileXYZToLonLat,
} from '../../.tmp/v2-tests/v2/shared/historicalAerialGeoreference.js';
import { HistoricalAerialLayer } from '../../.tmp/v2-tests/v2/prototypes/region/HistoricalAerialLayer.js';

const PLACEHOLDER_ICON = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEaaa==';

function kmlFor(name, north, south, east, west, template) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2"><Document>',
    '<GroundOverlay><name>', name, '</name>',
    '<Icon><href>', PLACEHOLDER_ICON, '</href></Icon>',
    '<LatLonBox><north>', north, '</north><south>', south, '</south><east>', east, '</east><west>', west, '</west></LatLonBox>',
    '<gx:MapTilePyramid><Link><href>', template, '</href></Link><gx:minLevel>0</gx:minLevel><gx:maxLevel>19</gx:maxLevel></gx:MapTilePyramid>',
    '</GroundOverlay></Document></kml>',
  ].join('');
}

test('HistoricalAerialKmlParser parses 1944, 1945 and 1958 with one shared path', () => {
  const inputs = [
    [kmlFor('金門舊航照影像(1944)', 24.5208965, 24.3932995, 118.4750534, 118.1987492, 'https://example.test/Kinmen_1944-png-{{z}}-{{x}}-{{y}}'), 1944],
    [kmlFor('金門舊航照影像(1945)', 24.5362935, 24.3437997, 118.4966956, 118.2727648, 'https://example.test/Kinmen_1945-png-{{z}}-{{x}}-{{y}}'), 1945],
    [kmlFor('金門舊航照圖(1958.09.10)', 24.5542212, 24.3789698, 118.4924002, 118.1973476, 'https://example.test/Kinmen_aerialphoto_1958-png-{{z}}-{{x}}-{{y}}'), 1958],
  ];
  for (const [text, year] of inputs) {
    const dataset = HistoricalAerialKmlParser.parse(text);
    assert.equal(dataset.year, year);
    assert.equal(dataset.minLevel, 0);
    assert.equal(dataset.maxLevel, 19);
    assert.equal(dataset.projection, 'EPSG:3857 / GoogleMapsCompatible');
    assert.equal(dataset.coordinateOrder, 'UNKNOWN');
    assert.equal(dataset.coverageGeometry.type, 'Polygon');
    assert.equal(dataset.coverageGeometry.coordinates[0].length, 5);
    assert.match(dataset.tileTemplate, /\{\{z\}\}/);
    assert.match(dataset.tileTemplate, /\{\{x\}\}/);
    assert.match(dataset.tileTemplate, /\{\{y\}\}/);
    assert.match(dataset.iconHref, /^data:image\/gif/);
  }
});

test('KML parser ignores the 1×1 Icon as imagery and uses MapTilePyramid', () => {
  const dataset = HistoricalAerialKmlParser.parse(
    kmlFor('金門舊航照影像(1945)', 24.5, 24.4, 118.5, 118.2, 'https://example.test/1945-{{z}}-{{x}}-{{y}}'),
  );
  assert.equal(dataset.tileTemplate, 'https://example.test/1945-{{z}}-{{x}}-{{y}}');
  assert.notEqual(dataset.tileTemplate, PLACEHOLDER_ICON);
  assert.equal(isLikelyPlaceholderTile(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 0, 1, 0]), 'image/gif'), true);
});

test('tracked 1944/1945/1958 KML metadata mirrors parse through the same registry path', () => {
  for (const year of [1944, 1945, 1958]) {
    const path = HISTORICAL_AERIAL_KML_PATHS[year];
    const dataset = HistoricalAerialKmlParser.parse(readFileSync(path, 'utf8'));
    assert.equal(dataset.year, year);
    assert.equal(dataset.coverageGeometry.coordinates[0].length, 5);
    assert.match(dataset.tileTemplate, new RegExp(`Kinmen_${year}|Kinmen_aerialphoto_${year}`));
  }
});

test('registry exposes all historical years, bounds and rights boundary', () => {
  assert.deepEqual(HISTORICAL_AERIAL_YEARS, [1944, 1945, 1958]);
  assert.equal(HISTORICAL_AERIAL_DATASETS.length, 3);
  assert.equal(validateHistoricalAerialRegistry(), true);
  assert.equal(getHistoricalAerialDataset(1944)?.historicalRole, 'PRIMARY');
  assert.equal(getHistoricalAerialDataset(1945)?.historicalRole, 'PRIMARY');
  assert.equal(getHistoricalAerialDataset(1958)?.historicalRole, 'FALLBACK');
  assert.ok(HISTORICAL_AERIAL_DATASETS.every(dataset => dataset.rightsStatus === 'BLOCKED — RIGHTS UNCLEAR'));
  assert.deepEqual(HISTORICAL_AERIAL_DATASETS.map(dataset => dataset.sourceKmlPath), [
    HISTORICAL_AERIAL_KML_PATHS[1944],
    HISTORICAL_AERIAL_KML_PATHS[1945],
    HISTORICAL_AERIAL_KML_PATHS[1958],
  ]);
});

test('coverage bounds contain and overlap according to KML LatLonBox', () => {
  const dataset = getHistoricalAerialDataset(1945);
  assert.ok(dataset);
  assert.equal(historicalAerialBoundsContain(dataset, 118.33, 24.47), true);
  assert.equal(historicalAerialBoundsContain(dataset, 118.1, 24.47), false);
  assert.equal(historicalAerialBoundsOverlap(dataset.bounds, { west: 118.2, south: 24.4, east: 118.35, north: 24.5 }), true);
  assert.equal(historicalAerialBoundsOverlap(dataset.bounds, { west: 119, south: 24, east: 120, north: 25 }), false);
});

test('quality analyzer measures multiple signals and normalizes within the dataset set', () => {
  const pixels = new Uint8Array([
    12, 16, 18, 255, 210, 200, 180, 255, 20, 30, 42, 255, 240, 230, 210, 255,
    18, 20, 22, 255, 0, 0, 0, 0, 120, 130, 140, 255, 230, 220, 210, 255,
    30, 42, 52, 255, 70, 80, 90, 255, 160, 170, 180, 255, 248, 240, 220, 255,
    36, 50, 62, 255, 80, 92, 104, 255, 170, 182, 194, 255, 250, 242, 224, 255,
  ]);
  const summary = analyzeHistoricalAerialPixels(pixels, { width: 4, height: 4, channels: 4, sampleStride: 1 });
  assert.ok(summary.sampleCount > 0);
  assert.ok(summary.sharpness >= 0 && summary.sharpness <= 1);
  assert.ok(summary.entropy > 0);
  assert.ok(summary.alphaValidRatio < 1);
  const normalized = normalizeHistoricalAerialQualitySet({
    1944: summary,
    1945: { ...summary, sharpness: 0.8, contrast: 0.8 },
    1958: { ...summary, sharpness: 0.2, contrast: 0.2 },
  });
  assert.equal(normalized[1945].normalizedScore > normalized[1958].normalizedScore, true);
  assert.equal(normalized[1944].confidence, 'measured-local-poc');
});

test('smart selection prefers 1944/1945 primary, then 1958 fallback, then modern BASE', () => {
  const quality = {
    1944: { normalizedScore: 0.42, validPixelRatio: 0.8, alphaValidRatio: 0.8 },
    1945: { normalizedScore: 0.71, validPixelRatio: 0.8, alphaValidRatio: 0.8 },
    1958: { normalizedScore: 0.95, validPixelRatio: 0.8, alphaValidRatio: 0.8 },
  };
  const options = {
    regionBounds: { west: 118.28, south: 24.44, east: 118.37, north: 24.52 },
    availability: { 1944: true, 1945: true, 1958: true },
    quality,
  };
  const primary = getHistoricalAerialSourceAt(118.33, 24.47, HISTORICAL_AERIAL_DATASETS, options);
  assert.equal(primary.year, 1945);
  assert.equal(primary.fallback, false);
  const fallback = getHistoricalAerialSourceAt(118.33, 24.47, HISTORICAL_AERIAL_DATASETS, { ...options, availability: { 1944: false, 1945: false, 1958: true } });
  assert.equal(fallback.year, 1958);
  assert.equal(fallback.fallback, true);
  const base = getHistoricalAerialSourceAt(118.33, 24.47, HISTORICAL_AERIAL_DATASETS, { ...options, availability: { 1944: false, 1945: false, 1958: false } });
  assert.equal(base.year, 'BASE');
  assert.equal(base.sourceType, 'modern-dem');
});

test('source mask is geographic, neighbor-smoothed and reports 1944/1945/1958/BASE distribution', () => {
  const mask = createHistoricalAerialSourceMask(HISTORICAL_AERIAL_DATASETS, {
    regionBounds: { west: 118.28, south: 24.44, east: 118.37, north: 24.52 },
    columns: 4,
    rows: 3,
    availability: { 1944: true, 1945: true, 1958: true },
    quality: {
      1944: { normalizedScore: 0.8, validPixelRatio: 0.9, alphaValidRatio: 0.9 },
      1945: { normalizedScore: 0.4, validPixelRatio: 0.9, alphaValidRatio: 0.9 },
      1958: { normalizedScore: 0.9, validPixelRatio: 0.9, alphaValidRatio: 0.9 },
    },
    neighborPasses: 2,
  });
  const distribution = mask.distribution();
  assert.equal(mask.cells.length, 12);
  assert.equal(mask.getHistoricalAerialSourceAt(118.33, 24.47).year, 1944);
  assert.equal(Math.round(distribution[1944] + distribution[1945] + distribution[1958] + distribution.BASE), 100);
});

test('tile conversion supports XYZ and TMS without zoom or Y ambiguity', () => {
  const tile = lonLatToXyzTile(118.33, 24.47, 12);
  const bounds = tileBounds(tile);
  assert.equal(bounds.z, 12);
  assert.ok(bounds.west <= 118.33 && bounds.east >= 118.33);
  assert.ok(bounds.south <= 24.47 && bounds.north >= 24.47);
  const tmsY = tileYForOrder(tile.xyzY, tile.z, 'TMS');
  assert.equal(tmsY, (2 ** tile.z) - 1 - tile.xyzY);
  const template = expandHistoricalAerialTileTemplate('https://example.test/{{z}}/{{x}}/{{y}}.png', tile);
  assert.equal(template, 'https://example.test/12/' + tile.x + '/' + tile.y + '.png');
  assert.equal(validateHistoricalAerialTileRequest(getHistoricalAerialDataset(1945), tile), true);
  assert.equal(enumerateHistoricalAerialTiles({ west: 118.28, south: 24.44, east: 118.37, north: 24.52 }, 12).length, 4);
});

test('download budget stays sequential, bounded and low-resolution for the Guningtou POC', () => {
  const bounds = { west: 118.278, south: 24.438, east: 118.372, north: 24.52 };
  const budget = estimateTileBudget(HISTORICAL_AERIAL_DATASETS, bounds, HISTORICAL_AERIAL_DOWNLOAD_BUDGET.preferredZoom);
  assert.equal(budget.totalTiles, 12);
  assert.equal(budget.withinBudget, true);
  assert.equal(HISTORICAL_AERIAL_DOWNLOAD_BUDGET.maxConcurrency, 1);
  assert.equal(HISTORICAL_AERIAL_DOWNLOAD_BUDGET.maxTilesTotal, 128);
  assert.equal(HISTORICAL_AERIAL_DOWNLOAD_BUDGET.maxBytesTotal, 50 * 1024 * 1024);
});

test('tileXYZToLonLat and tileRangeToBounds derive the authoritative z12 POC footprint', () => {
  const northWest = tileXYZToLonLat(3393, 1760, 12);
  const southEast = tileXYZToLonLat(3395, 1762, 12);
  assert.deepEqual(northWest, { longitude: 118.212890625, latitude: 24.5271348225978 });
  assert.deepEqual(southEast, { longitude: 118.388671875, latitude: 24.367113562651262 });
  assert.deepEqual(tileRangeToBounds({ z: 12, minX: 3393, maxX: 3394, minY: 1760, maxY: 1761 }), {
    west: 118.212890625,
    south: 24.367113562651262,
    east: 118.388671875,
    north: 24.5271348225978,
  });
  const guningtou = { longitude: 118.318, latitude: 24.478 };
  assert.equal(guningtou.longitude >= 118.212890625 && guningtou.longitude <= 118.388671875, true);
  assert.equal(guningtou.latitude >= 24.367113562651262 && guningtou.latitude <= 24.5271348225978, true);
});

test('geographicToAerialUV keeps northMapsToV0/southMapsToV1/westMapsToU0/eastMapsToU1', () => {
  const bounds = { west: 118.212890625, south: 24.367113562651262, east: 118.388671875, north: 24.5271348225978 };
  const centerLongitude = (bounds.west + bounds.east) / 2;
  const centerLatitude = (bounds.south + bounds.north) / 2;
  assert.deepEqual(geographicToAerialUV({ longitude: centerLongitude, latitude: bounds.north }, bounds), { u: 0.5, v: 0, inBounds: true });
  assert.deepEqual(geographicToAerialUV({ longitude: centerLongitude, latitude: bounds.south }, bounds), { u: 0.5, v: 1, inBounds: true });
  assert.deepEqual(geographicToAerialUV({ longitude: bounds.west, latitude: centerLatitude }, bounds), { u: 0, v: 0.5, inBounds: true });
  assert.deepEqual(geographicToAerialUV({ longitude: bounds.east, latitude: centerLatitude }, bounds), { u: 1, v: 0.5, inBounds: true });
  const guningtou = geographicToAerialUV({ longitude: 118.318, latitude: 24.478 }, bounds);
  assert.equal(guningtou.inBounds, true);
  assert.ok(Math.abs(guningtou.u - 0.5979555555555433) < 1e-12);
  assert.ok(Math.abs(guningtou.v - 0.30705184182536305) < 1e-12);
});

test('outsideBoundsReturnsBase prevents ClampToEdge from extending aerial pixels', () => {
  const bounds = tileRangeToBounds({ z: 12, minX: 3393, maxX: 3394, minY: 1760, maxY: 1761 });
  assert.equal(outsideBoundsReturnsBase({ longitude: 118.105, latitude: 24.49 }, bounds), true);
  assert.equal(outsideBoundsReturnsBase({ longitude: 118.318, latitude: 24.478 }, bounds), false);
});

test('smartCompositeUsesCommonGeographicGrid validates footprints before compositing', () => {
  const fullRange = { z: 12, minX: 3393, maxX: 3394, minY: 1760, maxY: 1761 };
  const partialRange = { z: 12, minX: 3394, maxX: 3394, minY: 1760, maxY: 1761 };
  const grid = range => ({
    tileRange: range,
    bounds: tileRangeToBounds(range),
    width: (range.maxX - range.minX + 1) * 256,
    height: (range.maxY - range.minY + 1) * 256,
    tileSize: 256,
  });
  assert.equal(smartCompositeUsesCommonGeographicGrid([grid(fullRange), grid(partialRange)]), true);
  assert.equal(smartCompositeUsesCommonGeographicGrid([{ ...grid(fullRange), width: 512, height: 256 }, grid(partialRange)]), false);
  assert.equal(smartCompositeUsesCommonGeographicGrid([{ ...grid(fullRange), tileRange: { ...fullRange, z: 11 } }]), false);
});

test('production layer remains rights-blocked and coverage toggle is observable without pixels', () => {
  const layer = new HistoricalAerialLayer({ year: 1945, mode: 'AERIAL', opacity: 65 });
  assert.equal(layer.getStats().status, 'RIGHTS BLOCKED');
  assert.equal(layer.getStats().payloadBytes, 0);
  assert.equal(layer.getStats().alignment, 'SOURCE REVIEW');
  layer.setCoverageMaskDebug(true);
  assert.equal(layer.getStats().coverageMaskDebug, true);
  layer.setSelectionMode('comparison');
  assert.equal(layer.getStats().selectionMode, 'comparison');
  layer.dispose();
});
