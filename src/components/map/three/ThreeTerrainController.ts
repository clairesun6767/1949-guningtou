import * as THREE from 'three';
import { wgs84ToLocalMeters } from '../../../battle-replay/visualization/adapters/threeAdapter.js';
import type { Position } from '../../../battle-replay/types/index.js';
import { HistoricalTerrainStyle, type TerrainExaggeration } from './HistoricalTerrainStyle.js';

export interface TerrainAsset {
  id: string;
  coordinateSystem: 'EPSG:4326';
  bounds: { west: number; south: number; east: number; north: number };
  grid: { width: number; height: number };
  source: {
    title: string;
    attribution: string;
    approximateNativeResolutionMetres: number;
    temporalScope: string;
  };
  derivation: { minElevationMetres: number; maxElevationMetres: number };
  heights: number[];
  land: number[];
}

export interface TerrainCoverageMask {
  schemaVersion: string;
  assetId: string;
  coordinateSystem: 'EPSG:4326';
  bounds: TerrainAsset['bounds'];
  grid: TerrainAsset['grid'];
  values: number[];
  validSampleCount: number;
  method: string;
  referenceEra: 'modern_reference';
  note: string;
}

export interface TerrainOwnershipStats {
  supportedSamples: number;
  regionalOwnerSamples: number;
  localOwnerSamples: number;
  noOwnerSamples: number;
  overlapSamples: number;
}

export interface TerrainMeshBundle {
  asset: TerrainAsset;
  group: THREE.Group;
  terrainMesh: THREE.Mesh;
  terrainMaterial: THREE.MeshStandardMaterial;
  landPolygons: Position[][];
  landMask: THREE.CanvasTexture;
  classificationMasks: [THREE.Texture, THREE.Texture];
  classificationUniforms: Record<string, { value: number }>;
  holeBounds?: TerrainAsset['bounds'];
  coverageMask?: TerrainCoverageMask;
  ownershipStats: TerrainOwnershipStats;
  triangleStats: { included: number; excluded: number };
}

const SCALE = HistoricalTerrainStyle.terrain.worldUnitsPerMetre;

function gridCoordinate(asset: TerrainAsset, row: number, column: number): Position {
  const { west, south, east, north } = asset.bounds;
  const longitude = west + (column / (asset.grid.width - 1)) * (east - west);
  const latitude = north - (row / (asset.grid.height - 1)) * (north - south);
  return [longitude, latitude];
}

function gridPoint(asset: TerrainAsset, row: number, column: number, exaggeration: number) {
  const [longitude, latitude] = gridCoordinate(asset, row, column);
  const local = wgs84ToLocalMeters([longitude, latitude]);
  const elevation = asset.heights[row * asset.grid.width + column] ?? 0;
  return new THREE.Vector3(local.eastMetres * SCALE, elevation * exaggeration * SCALE, -local.northMetres * SCALE);
}

function elevationColor(elevation: number, maxElevation: number) {
  const low = new THREE.Color(HistoricalTerrainStyle.terrain.lowColor);
  const middle = new THREE.Color(HistoricalTerrainStyle.terrain.middleColor);
  const high = new THREE.Color(HistoricalTerrainStyle.terrain.highColor);
  const t = Math.min(1, elevation / Math.max(maxElevation, 1));
  return t < .55 ? low.lerp(middle, t / .55) : middle.lerp(high, (t - .55) / .45);
}

// Retained as a V0.7 audit helper. V0.8 no longer calls this rectangular test
// for terrain ownership or regional triangle exclusion.
function triangleOverlapsBounds(coordinates: Position[], bounds: TerrainAsset['bounds']) {
  const longitudes = coordinates.map(([longitude]) => longitude);
  const latitudes = coordinates.map(([, latitude]) => latitude);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  return maxLongitude >= bounds.west
    && minLongitude <= bounds.east
    && maxLatitude >= bounds.south
    && minLatitude <= bounds.north;
}

void triangleOverlapsBounds;

export function isTerrainCoverageSample(mask: TerrainCoverageMask, [longitude, latitude]: Position) {
  if (longitude < mask.bounds.west || longitude > mask.bounds.east || latitude < mask.bounds.south || latitude > mask.bounds.north) return false;
  const column = Math.max(0, Math.min(mask.grid.width - 1, Math.round(((longitude - mask.bounds.west) / (mask.bounds.east - mask.bounds.west)) * (mask.grid.width - 1))));
  const row = Math.max(0, Math.min(mask.grid.height - 1, Math.round(((mask.bounds.north - latitude) / (mask.bounds.north - mask.bounds.south)) * (mask.grid.height - 1))));
  return mask.values[row * mask.grid.width + column] === 1;
}

function triangleHasCoverage(coordinates: Position[], coverageMask: TerrainCoverageMask) {
  const [first, second, third] = coordinates;
  const centroid: Position = [
    (first[0] + second[0] + third[0]) / 3,
    (first[1] + second[1] + third[1]) / 3,
  ];
  return [...coordinates, centroid].every(coordinate => isTerrainCoverageSample(coverageMask, coordinate));
}

function buildGeometry(asset: TerrainAsset, exaggeration: TerrainExaggeration, holeBounds?: TerrainAsset['bounds'], coverageMask?: TerrainCoverageMask) {
  void holeBounds;
  const positions: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const width = asset.grid.width;
  const height = asset.grid.height;

  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const point = gridPoint(asset, row, column, exaggeration);
      positions.push(point.x, point.y, point.z);
      uvs.push(column / (width - 1), 1 - row / (height - 1));
      const color = elevationColor(asset.heights[row * width + column], asset.derivation.maxElevationMetres);
      colors.push(color.r, color.g, color.b);
    }
  }

  const addTriangle = (a: number, b: number, c: number, coordinates: Position[]) => {
    if (coverageMask && triangleHasCoverage(coordinates, coverageMask)) return false;
    indices.push(a, b, c);
    return true;
  };
  let excludedTriangles = 0;
  for (let row = 0; row < height - 1; row += 1) {
    for (let column = 0; column < width - 1; column += 1) {
      const a = row * width + column;
      const b = a + 1;
      const c = a + width;
      const d = c + 1;
      const cellCoordinates = [
        gridCoordinate(asset, row, column),
        gridCoordinate(asset, row + 1, column),
        gridCoordinate(asset, row, column + 1),
        gridCoordinate(asset, row + 1, column + 1),
      ];
      if (!addTriangle(a, c, b, [cellCoordinates[0], cellCoordinates[1], cellCoordinates[2]])) excludedTriangles += 1;
      if (!addTriangle(b, c, d, [cellCoordinates[2], cellCoordinates[1], cellCoordinates[3]])) excludedTriangles += 1;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return { geometry, triangleStats: { included: indices.length / 3, excluded: excludedTriangles } };
}

function buildLandMask(asset: TerrainAsset, polygons: Position[][]) {
  const width = asset.id.includes('local') ? 2048 : 2048;
  const height = Math.max(512, Math.round(width * ((asset.bounds.north - asset.bounds.south) / (asset.bounds.east - asset.bounds.west))));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D is unavailable for the OSM coastline terrain mask.');
  context.fillStyle = '#000';
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#fff';
  for (const ring of polygons) {
    context.beginPath();
    ring.forEach(([longitude, latitude], index) => {
      const x = ((longitude - asset.bounds.west) / (asset.bounds.east - asset.bounds.west)) * width;
      const y = ((asset.bounds.north - latitude) / (asset.bounds.north - asset.bounds.south)) * height;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.closePath();
    context.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

export async function loadTerrainAsset(url: string): Promise<TerrainAsset> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Terrain asset failed: ${response.status} ${url}`);
  const asset = await response.json() as TerrainAsset;
  if (asset.coordinateSystem !== 'EPSG:4326' || asset.heights.length !== asset.grid.width * asset.grid.height) {
    throw new Error(`Terrain asset schema invalid: ${asset.id}`);
  }
  return asset;
}

export async function loadTerrainCoverageMask(url: string): Promise<TerrainCoverageMask> {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Terrain coverage mask failed: ' + response.status + ' ' + url);
  const mask = await response.json() as TerrainCoverageMask;
  if (mask.coordinateSystem !== 'EPSG:4326' || mask.values.length !== mask.grid.width * mask.grid.height) {
    throw new Error('Terrain coverage mask schema invalid: ' + mask.assetId);
  }
  return mask;
}

export type ClassificationTextureFilter = 'nearest' | 'linear' | 'mipmap';

export interface ClassificationTextureOptions {
  filter?: ClassificationTextureFilter;
  anisotropy?: number;
}

export async function loadClassificationMasks(aUrl: string, bUrl: string, options: ClassificationTextureOptions = {}) {
  const loader = new THREE.TextureLoader();
  const masks = await Promise.all([loader.loadAsync(aUrl), loader.loadAsync(bUrl)]);
  const filter = options.filter ?? 'mipmap';
  for (const texture of masks) {
    texture.colorSpace = THREE.NoColorSpace;
    // The generated masks store the northern edge in image row 0 while terrain
    // UVs use v=1 for that same edge. Keep the default image upload orientation
    // explicit so the geographic raster/UV contract is not implicit.
    texture.flipY = true;
    texture.generateMipmaps = filter === 'mipmap';
    texture.minFilter = filter === 'nearest' ? THREE.NearestFilter : filter === 'linear' ? THREE.LinearFilter : THREE.LinearMipmapLinearFilter;
    texture.magFilter = filter === 'nearest' ? THREE.NearestFilter : THREE.LinearFilter;
    if (typeof options.anisotropy === 'number') texture.anisotropy = options.anisotropy;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
  }
  return masks as [THREE.Texture, THREE.Texture];
}

export function createTerrainBundle(
  asset: TerrainAsset,
  exaggeration: TerrainExaggeration,
  polygons: Position[][],
  classificationMasks: [THREE.Texture, THREE.Texture],
  localLod = false,
  holeBounds?: TerrainAsset['bounds'],
  coverageMask?: TerrainCoverageMask,
): TerrainMeshBundle {
  const group = new THREE.Group();
  group.name = `terrain-${asset.id}`;
  const landMask = buildLandMask(asset, polygons);
  const terrainMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    alphaMap: landMask,
    alphaTest: .45,
    roughness: HistoricalTerrainStyle.terrain.roughness,
    metalness: 0,
    transparent: false,
    depthWrite: true,
  });
  const classificationUniforms = {
    agriculture: { value: 1 },
    forest: { value: 1 },
    settlement: { value: 1 },
    beach: { value: 1 },
    classificationOnly: { value: 0 },
    solidTerrain: { value: 0 },
  };
  terrainMaterial.onBeforeCompile = shader => {
    shader.uniforms.classificationMaskA = { value: classificationMasks[0] };
    shader.uniforms.classificationMaskB = { value: classificationMasks[1] };
    shader.uniforms.classificationAgriculture = classificationUniforms.agriculture;
    shader.uniforms.classificationForest = classificationUniforms.forest;
    shader.uniforms.classificationSettlement = classificationUniforms.settlement;
    shader.uniforms.classificationBeach = classificationUniforms.beach;
    shader.uniforms.solidTerrain = classificationUniforms.solidTerrain;
    shader.vertexShader = `varying vec2 vClassificationUv;\n${shader.vertexShader}`.replace(
      '#include <uv_vertex>',
      '#include <uv_vertex>\nvClassificationUv = uv;',
    );
    shader.fragmentShader = `
      varying vec2 vClassificationUv;
      uniform sampler2D classificationMaskA;
      uniform sampler2D classificationMaskB;
      uniform float classificationAgriculture;
      uniform float classificationForest;
      uniform float classificationSettlement;
      uniform float classificationBeach;
      uniform float classificationOnly;
      uniform float solidTerrain;
      ${shader.fragmentShader}
    `.replace('#include <color_fragment>', `
      #include <color_fragment>
      vec3 maskA = texture2D(classificationMaskA, vClassificationUv).rgb;
      vec3 maskB = texture2D(classificationMaskB, vClassificationUv).rgb;
      vec3 classificationColor = vec3(0.12, 0.14, 0.13);
      classificationColor = mix(classificationColor, vec3(0.45, 0.53, 0.40), maskB.g * classificationAgriculture * 0.82);
      classificationColor = mix(classificationColor, vec3(0.53, 0.58, 0.37), maskA.r * classificationAgriculture * 0.92);
      classificationColor = mix(classificationColor, vec3(0.25, 0.35, 0.26), maskA.g * classificationForest);
      classificationColor = mix(classificationColor, vec3(0.74, 0.64, 0.50), maskA.b * classificationSettlement);
      classificationColor = mix(classificationColor, vec3(0.88, 0.76, 0.49), maskB.r * classificationBeach);
      diffuseColor.rgb = mix(diffuseColor.rgb, classificationColor, classificationOnly);
      if (classificationOnly < 0.5) {
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.459, 0.529, 0.400), maskB.g * classificationAgriculture * 0.72);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.529, 0.576, 0.373), maskA.r * classificationAgriculture * 0.86);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.247, 0.349, 0.255), maskA.g * classificationForest * 0.94);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.737, 0.635, 0.498), maskA.b * classificationSettlement * 0.88);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.878, 0.761, 0.494), maskB.r * classificationBeach * 0.92);
      }
      if (solidTerrain > 0.5) {
        diffuseColor.rgb = vec3(0.96, 0.96, 0.96);
        diffuseColor.a = 1.0;
      }
      // Local ownership is already resolved by the regional coverage mask.
      // Do not feather local LOD edges through alphaTest: that discards the
      // local boundary after regional triangles have been removed, producing
      // long gaps and temporal shimmer at the ownership seam.
    `);
  };
  terrainMaterial.customProgramCacheKey = () => `classification-v08-${localLod ? 'local' : 'regional'}`;
  const built = buildGeometry(asset, exaggeration, holeBounds, coverageMask);
  const terrain = new THREE.Mesh(built.geometry, terrainMaterial);
  terrain.name = `terrain-mesh-${asset.id}`;
  terrain.receiveShadow = true;
  terrain.castShadow = true;
  group.add(terrain);
  return {
    asset,
    group,
    terrainMesh: terrain,
    terrainMaterial,
    landPolygons: polygons,
    landMask,
    classificationMasks,
    classificationUniforms,
    holeBounds,
    coverageMask,
    ownershipStats: {
      supportedSamples: coverageMask?.validSampleCount ?? 0,
      regionalOwnerSamples: 0,
      localOwnerSamples: 0,
      noOwnerSamples: 0,
      overlapSamples: 0,
    },
    triangleStats: built.triangleStats,
  };
}

export function updateTerrainClassification(bundle: TerrainMeshBundle, enabled: Set<string>) {
  bundle.classificationUniforms.agriculture.value = enabled.has('land-cover') ? 1 : 0;
  bundle.classificationUniforms.forest.value = enabled.has('vegetation') ? 1 : 0;
  bundle.classificationUniforms.settlement.value = enabled.has('settlements') ? 1 : 0;
  bundle.classificationUniforms.beach.value = enabled.has('beaches') ? 1 : 0;
}

export function rebuildTerrainBundle(bundle: TerrainMeshBundle, exaggeration: TerrainExaggeration) {
  bundle.terrainMesh.geometry.dispose();
  const built = buildGeometry(bundle.asset, exaggeration, bundle.holeBounds, bundle.coverageMask);
  bundle.terrainMesh.geometry = built.geometry;
  bundle.triangleStats = built.triangleStats;
}

export function sampleTerrainSurfaceHeight(asset: TerrainAsset | undefined, longitude: number, latitude: number, exaggeration: number) {
  if (!asset) return 0;
  const { west, south, east, north } = asset.bounds;
  const column = Math.round(((longitude - west) / (east - west)) * (asset.grid.width - 1));
  const row = Math.round(((north - latitude) / (north - south)) * (asset.grid.height - 1));
  if (column < 0 || column >= asset.grid.width || row < 0 || row >= asset.grid.height) return 0;
  return Math.max(0, (asset.heights[row * asset.grid.width + column] ?? 0) * exaggeration * SCALE);
}

export function sampleTerrainHeight(asset: TerrainAsset | undefined, longitude: number, latitude: number, exaggeration: number) {
  return sampleTerrainSurfaceHeight(asset, longitude, latitude, exaggeration) + .035;
}

export function setTerrainClassificationQa(bundle: TerrainMeshBundle, classificationOnly: boolean) {
  bundle.classificationUniforms.classificationOnly.value = classificationOnly ? 1 : 0;
}

export function setTerrainSolid(bundle: TerrainMeshBundle, solid: boolean) {
  bundle.classificationUniforms.solidTerrain.value = solid ? 1 : 0;
}

export function disposeTerrainBundle(bundle: TerrainMeshBundle) {
  bundle.group.traverse(object => {
    if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) object.geometry.dispose();
  });
  bundle.terrainMaterial.dispose();
  bundle.landMask.dispose();
  bundle.classificationMasks.forEach(texture => texture.dispose());
}
