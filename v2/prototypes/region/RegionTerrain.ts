import * as THREE from 'three';
import { REGION_CONFIG, type RegionVariantId } from '../../config/region.js';
import { lonLatToWorld } from '../../shared/geo.js';
import type { RegionCoastlineAsset, RegionTerrainAsset } from '../../shared/regionDataProvider.js';

export interface RegionTerrainTextures {
  classificationA: THREE.Texture;
  classificationB: THREE.Texture;
}

export interface RegionTerrainHandle {
  group: THREE.Group;
  mesh: THREE.Mesh;
  wireframe: THREE.LineSegments;
  triangles: number;
  vertices: number;
  textureEstimateBytes: number;
  setTextures(textures: RegionTerrainTextures): void;
  setTextureEnabled(enabled: boolean): void;
  setVariant(variant: RegionVariantId): void;
  setWireframe(enabled: boolean): void;
  dispose(): void;
}

type LonLat = [number, number];

function polygonRings(asset: RegionCoastlineAsset): LonLat[][] {
  const rings: LonLat[][] = [];
  for (const feature of asset.features) {
    if (feature.geometry.type === 'Polygon') {
      const coordinates = feature.geometry.coordinates as LonLat[][];
      rings.push(...coordinates);
    } else {
      const coordinates = feature.geometry.coordinates as LonLat[][][][];
      rings.push(...coordinates.flat(2));
    }
  }
  return rings.filter(ring => ring.length >= 3);
}

function pointInRing(point: LonLat, ring: LonLat[]) {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const [x, y] = ring[index];
    const [previousX, previousY] = ring[previous];
    const intersects = ((y > point[1]) !== (previousY > point[1]))
      && point[0] < ((previousX - x) * (point[1] - y)) / (previousY - y) + x;
    if (intersects) inside = !inside;
  }
  return inside;
}

function isLand(point: LonLat, rings: LonLat[][]) {
  return rings.some(ring => pointInRing(point, ring));
}

function terrainColor(height: number, maxHeight: number, index: number) {
  const low = new THREE.Color('#596755');
  const middle = new THREE.Color('#8a8c69');
  const high = new THREE.Color('#c1ad7f');
  const normalized = Math.min(1, Math.max(0, height / Math.max(maxHeight, 1)));
  const color = normalized < 0.52
    ? low.clone().lerp(middle, normalized / 0.52)
    : middle.clone().lerp(high, (normalized - 0.52) / 0.48);
  const grain = ((index * 17) % 23) / 23 - 0.5;
  color.multiplyScalar(1 + grain * 0.055);
  return color;
}

function createGeometry(asset: RegionTerrainAsset, coastline: RegionCoastlineAsset) {
  const { width, height } = asset.grid;
  const positions: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const rings = polygonRings(coastline);

  for (let row = 0; row < height; row += 1) {
    const latitude = asset.bounds.north - (row / (height - 1)) * (asset.bounds.north - asset.bounds.south);
    for (let column = 0; column < width; column += 1) {
      const longitude = asset.bounds.west + (column / (width - 1)) * (asset.bounds.east - asset.bounds.west);
      const sample = asset.heights[row * width + column] ?? 0;
      const point = lonLatToWorld({ longitude, latitude }, Math.max(0, sample) * REGION_CONFIG.terrain.verticalExaggeration * REGION_CONFIG.worldUnitsPerMetre);
      positions.push(point.x, point.y, point.z);
      const color = terrainColor(sample, asset.derivation.maxElevationMetres, row * width + column);
      colors.push(color.r, color.g, color.b);
      uvs.push(column / (width - 1), 1 - row / (height - 1));
    }
  }

  let triangles = 0;
  for (let row = 0; row < height - 1; row += 1) {
    const south = asset.bounds.north - ((row + 1) / (height - 1)) * (asset.bounds.north - asset.bounds.south);
    const north = asset.bounds.north - (row / (height - 1)) * (asset.bounds.north - asset.bounds.south);
    for (let column = 0; column < width - 1; column += 1) {
      const west = asset.bounds.west + (column / (width - 1)) * (asset.bounds.east - asset.bounds.west);
      const east = asset.bounds.west + ((column + 1) / (width - 1)) * (asset.bounds.east - asset.bounds.west);
      const center: LonLat = [(west + east) / 2, (south + north) / 2];
      if (!isLand(center, rings)) continue;
      const a = row * width + column;
      const b = a + 1;
      const c = a + width;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
      triangles += 2;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return { geometry, triangles, vertices: positions.length / 3 };
}

function variantIndex(variant: RegionVariantId) {
  return variant === 'cinematic' ? 1 : variant === 'historical' ? 2 : 0;
}

export function createRegionTerrain(asset: RegionTerrainAsset, coastline: RegionCoastlineAsset, textures: RegionTerrainTextures): RegionTerrainHandle {
  const built = createGeometry(asset, coastline);
  const group = new THREE.Group();
  group.name = 'v2-region-terrain';
  const uniforms = {
    classificationA: { value: textures.classificationA },
    classificationB: { value: textures.classificationB },
    textureEnabled: { value: 1 },
    variant: { value: 0 },
    maxElevation: { value: REGION_CONFIG.terrain.maxElevationWorld },
  };
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.88,
    metalness: 0.02,
    flatShading: false,
  });
  material.onBeforeCompile = shader => {
    shader.uniforms.regionClassificationA = uniforms.classificationA;
    shader.uniforms.regionClassificationB = uniforms.classificationB;
    shader.uniforms.regionTextureEnabled = uniforms.textureEnabled;
    shader.uniforms.regionVariant = uniforms.variant;
    shader.uniforms.regionMaxElevation = uniforms.maxElevation;
    shader.vertexShader = `uniform float regionMaxElevation; varying vec2 vRegionUv; varying float vRegionHeight;\n${shader.vertexShader}`
      .replace('#include <uv_vertex>', '#include <uv_vertex>\n    vRegionUv = uv;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n    vRegionHeight = clamp(position.y / regionMaxElevation, 0.0, 1.0);');
    shader.fragmentShader = `
      varying vec2 vRegionUv;
      varying float vRegionHeight;
      uniform sampler2D regionClassificationA;
      uniform sampler2D regionClassificationB;
      uniform float regionTextureEnabled;
      uniform float regionVariant;
      ${shader.fragmentShader}
    `.replace('#include <color_fragment>', `
      #include <color_fragment>
      vec3 regionMaskA = texture2D(regionClassificationA, vRegionUv).rgb;
      vec3 regionMaskB = texture2D(regionClassificationB, vRegionUv).rgb;
      float vegetation = regionMaskA.g * 0.08;
      float agriculture = regionMaskA.r * 0.055;
      float settlement = regionMaskA.b * 0.045;
      float beach = regionMaskB.r * 0.04;
      float masksEnabled = regionTextureEnabled;
      diffuseColor.rgb *= 1.0 + masksEnabled * (vegetation + agriculture + settlement + beach);
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.12, 0.88, 0.75), regionVariant * 0.22);
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.10, 1.04, 0.82), step(1.5, regionVariant) * 0.24);
      float contour = 1.0 - smoothstep(0.0, 0.07, abs(fract(vRegionHeight * 11.0) - 0.5));
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.48, 0.46, 0.34), contour * 0.12);
    `);
  };
  material.customProgramCacheKey = () => 'v2-region-terrain-material-1';
  const mesh = new THREE.Mesh(built.geometry, material);
  mesh.name = 'v2-region-terrain-mesh';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  const wireframe = new THREE.LineSegments(
    new THREE.WireframeGeometry(built.geometry),
    new THREE.LineBasicMaterial({ color: '#e5c988', transparent: true, opacity: 0.3, depthTest: false }),
  );
  wireframe.name = 'v2-region-terrain-wireframe';
  wireframe.visible = false;
  wireframe.renderOrder = 10;
  group.add(wireframe);

  return {
    group,
    mesh,
    wireframe,
    triangles: built.triangles,
    vertices: built.vertices,
    textureEstimateBytes: 2 * 2048 * 1041 * 4,
    setTextures(nextTextures) {
      uniforms.classificationA.value = nextTextures.classificationA;
      uniforms.classificationB.value = nextTextures.classificationB;
    },
    setTextureEnabled(enabled) {
      uniforms.textureEnabled.value = enabled ? 1 : 0;
      material.needsUpdate = true;
    },
    setVariant(variant) {
      uniforms.variant.value = variantIndex(variant);
      material.needsUpdate = true;
    },
    setWireframe(enabled) {
      wireframe.visible = enabled;
    },
    dispose() {
      built.geometry.dispose();
      material.dispose();
      wireframe.geometry.dispose();
      wireframe.material.dispose();
    },
  };
}

export function sampleRegionTerrainHeight(asset: RegionTerrainAsset, longitude: number, latitude: number) {
  const { west, south, east, north } = asset.bounds;
  const column = Math.round(((longitude - west) / (east - west)) * (asset.grid.width - 1));
  const row = Math.round(((north - latitude) / (north - south)) * (asset.grid.height - 1));
  if (column < 0 || column >= asset.grid.width || row < 0 || row >= asset.grid.height) return 0;
  const elevation = asset.heights[row * asset.grid.width + column] ?? 0;
  return elevation * REGION_CONFIG.terrain.verticalExaggeration * REGION_CONFIG.worldUnitsPerMetre;
}
