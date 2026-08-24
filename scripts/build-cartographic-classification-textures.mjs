import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const root = process.cwd();
const outputDirectory = path.join(root, 'public', 'map-data');

function crc32(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit += 1) value = (value >>> 1) ^ (0xedb88320 & -(value & 1));
  }
  return (value ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function writePng(filename, width, height, pixels) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let row = 0; row < height; row += 1) {
    const target = row * (width * 4 + 1);
    raw[target] = 0;
    pixels.copy(raw, target + 1, row * width * 4, (row + 1) * width * 4);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  fs.writeFileSync(filename, Buffer.concat([signature, chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
}

function pixelRing(ring, bounds, width, height) {
  return ring.map(([longitude, latitude]) => [
    ((longitude - bounds.west) / (bounds.east - bounds.west)) * (width - 1),
    ((bounds.north - latitude) / (bounds.north - bounds.south)) * (height - 1),
  ]);
}

function fillRing(pixels, width, height, ring, channel, value) {
  if (ring.length < 3) return;
  const minimumY = Math.max(0, Math.floor(Math.min(...ring.map(point => point[1]))));
  const maximumY = Math.min(height - 1, Math.ceil(Math.max(...ring.map(point => point[1]))));
  for (let y = minimumY; y <= maximumY; y += 1) {
    const scan = y + .5;
    const intersections = [];
    for (let index = 0; index < ring.length; index += 1) {
      const start = ring[index];
      const end = ring[(index + 1) % ring.length];
      if ((start[1] <= scan && end[1] > scan) || (end[1] <= scan && start[1] > scan)) {
        intersections.push(start[0] + ((scan - start[1]) / (end[1] - start[1])) * (end[0] - start[0]));
      }
    }
    intersections.sort((a, b) => a - b);
    for (let index = 0; index + 1 < intersections.length; index += 2) {
      const startX = Math.max(0, Math.ceil(intersections[index]));
      const endX = Math.min(width - 1, Math.floor(intersections[index + 1]));
      for (let x = startX; x <= endX; x += 1) pixels[(y * width + x) * 4 + channel] = value;
    }
  }
}

function paintCategory(pixels, features, bounds, width, height, channel) {
  for (const feature of features) {
    const geometry = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.type === 'MultiPolygon' ? feature.geometry.coordinates : [];
    for (const polygon of geometry) {
      polygon.forEach((ring, index) => fillRing(pixels, width, height, pixelRing(ring, bounds, width, height), channel, index === 0 ? 255 : 0));
    }
  }
}

function build(scope, terrainName, cartographyName) {
  const terrain = JSON.parse(fs.readFileSync(path.join(root, 'public', 'terrain', terrainName), 'utf8'));
  const cartography = JSON.parse(fs.readFileSync(path.join(outputDirectory, cartographyName), 'utf8'));
  const width = 2048;
  const aspect = (terrain.bounds.north - terrain.bounds.south) / (terrain.bounds.east - terrain.bounds.west);
  const height = Math.max(1024, Math.round(width * aspect));
  const maskA = Buffer.alloc(width * height * 4);
  const maskB = Buffer.alloc(width * height * 4);
  for (let index = 3; index < maskA.length; index += 4) {
    maskA[index] = 255;
    maskB[index] = 255;
  }
  const category = name => cartography.features.filter(feature => feature.properties.category === name);
  paintCategory(maskA, category('agriculture'), terrain.bounds, width, height, 0);
  paintCategory(maskA, category('forest'), terrain.bounds, width, height, 1);
  paintCategory(maskA, category('settlement'), terrain.bounds, width, height, 2);
  paintCategory(maskB, category('beach'), terrain.bounds, width, height, 0);
  paintCategory(maskB, category('open-ground'), terrain.bounds, width, height, 1);
  writePng(path.join(outputDirectory, `${scope}-classification-a.png`), width, height, maskA);
  writePng(path.join(outputDirectory, `${scope}-classification-b.png`), width, height, maskB);
  fs.writeFileSync(path.join(outputDirectory, `${scope}-classification.json`), JSON.stringify({
    version: '0.6.0', scope, coordinateSystem: 'EPSG:4326', bounds: terrain.bounds, width, height,
    channels: { maskA: { r: 'agriculture', g: 'forest', b: 'settlement' }, maskB: { r: 'beach', g: 'open-ground' } },
    source: cartography.metadata.source,
    note: 'Build-time semantic classification masks. Linear data and buildings remain geometry.',
  }, null, 2));
  return { scope, width, height };
}

fs.mkdirSync(outputDirectory, { recursive: true });
const outputs = [
  build('regional', 'kinmen-xiamen-regional.json', 'regional-cartography.geojson'),
  build('guningtou', 'guningtou-local.json', 'guningtou-cartography.geojson'),
];
console.log(JSON.stringify({ status: 'ok', outputs }, null, 2));
