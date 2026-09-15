import * as THREE from 'three';
import {
  type HistoricalAerialMode,
  HISTORICAL_ART_PALETTE,
} from '../../config/historicalAerial.js';
import {
  REGION_CONFIG,
  type RegionContourMode,
  type RegionLightingMode,
  type RegionTerrainQualityId,
  type RegionVariantId,
} from '../../config/region.js';
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
  quality: RegionTerrainQualityId;
  grid: string;
  coastlineResolution: string;
  sourceLabel: string;
  assetPayloadBytes: number;
  triangles: number;
  vertices: number;
  textureEstimateBytes: number;
  setTextures(textures: RegionTerrainTextures): void;
  setTextureEnabled(enabled: boolean): void;
  setVariant(variant: RegionVariantId): void;
  setWireframe(enabled: boolean): void;
  setVerticalExaggeration(verticalExaggeration: number): void;
  setLightingMode(mode: RegionLightingMode): void;
  setContourMode(mode: RegionContourMode): void;
  setAoEnabled(enabled: boolean): void;
  setCoastDebug(enabled: boolean): void;
  setHistoricalToneEnabled(enabled: boolean): void;
  setHistoricalMode(mode: HistoricalAerialMode): void;
  setAerialOpacity(opacity: number): void;
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

function createGeometry(asset: RegionTerrainAsset, coastline: RegionCoastlineAsset, verticalExaggeration: number) {
  const { width, height } = asset.grid;
  const positions: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  const elevations: number[] = [];
  const indices: number[] = [];
  const rings = polygonRings(coastline);

  for (let row = 0; row < height; row += 1) {
    const latitude = asset.bounds.north - (row / (height - 1)) * (asset.bounds.north - asset.bounds.south);
    for (let column = 0; column < width; column += 1) {
      const longitude = asset.bounds.west + (column / (width - 1)) * (asset.bounds.east - asset.bounds.west);
      const sample = asset.heights[row * width + column] ?? 0;
      const point = lonLatToWorld({ longitude, latitude }, Math.max(0, sample) * verticalExaggeration * REGION_CONFIG.worldUnitsPerMetre);
      positions.push(point.x, point.y, point.z);
      elevations.push(sample);
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
  return { geometry, triangles, vertices: positions.length / 3, elevations };
}

function variantIndex(variant: RegionVariantId) {
  return variant === 'cinematic' ? 1 : variant === 'historical' ? 2 : 0;
}

function historicalModeIndex(mode: HistoricalAerialMode) {
  return mode === 'AERIAL' ? 1 : mode === 'AERIAL_RELIEF' ? 2 : 0;
}

export function createRegionTerrain(
  asset: RegionTerrainAsset,
  coastline: RegionCoastlineAsset,
  textures: RegionTerrainTextures,
  options: {
    verticalExaggeration?: number;
    historicalToneEnabled?: boolean;
    historicalMode?: HistoricalAerialMode;
    aerialOpacity?: number;
  } = {},
): RegionTerrainHandle {
  const baseVerticalExaggeration = REGION_CONFIG.terrain.verticalExaggeration;
  let verticalExaggeration = options.verticalExaggeration ?? baseVerticalExaggeration;
  const built = createGeometry(asset, coastline, verticalExaggeration);
  const group = new THREE.Group();
  group.name = 'v2-region-terrain';
  const uniforms = {
    classificationA: { value: textures.classificationA },
    classificationB: { value: textures.classificationB },
    textureEnabled: { value: 1 },
    variant: { value: 0 },
    maxElevation: { value: REGION_CONFIG.terrain.maxElevationWorld * verticalExaggeration / baseVerticalExaggeration },
    contourMode: { value: 1 },
    aoEnabled: { value: 1 },
    historicalTone: { value: options.historicalToneEnabled ? 1 : 0 },
    historicalMode: { value: historicalModeIndex(options.historicalMode ?? 'OFF') },
    aerialOpacity: { value: Math.min(100, Math.max(0, options.aerialOpacity ?? 0)) / 100 },
    historicalLow: { value: new THREE.Color(HISTORICAL_ART_PALETTE.low) },
    historicalMiddle: { value: new THREE.Color(HISTORICAL_ART_PALETTE.middle) },
    historicalHigh: { value: new THREE.Color(HISTORICAL_ART_PALETTE.high) },
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
    shader.uniforms.regionContourMode = uniforms.contourMode;
    shader.uniforms.regionAoEnabled = uniforms.aoEnabled;
    shader.uniforms.regionHistoricalTone = uniforms.historicalTone;
    shader.uniforms.regionHistoricalMode = uniforms.historicalMode;
    shader.uniforms.regionAerialOpacity = uniforms.aerialOpacity;
    shader.uniforms.regionHistoricalLow = uniforms.historicalLow;
    shader.uniforms.regionHistoricalMiddle = uniforms.historicalMiddle;
    shader.uniforms.regionHistoricalHigh = uniforms.historicalHigh;
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
      uniform float regionContourMode;
      uniform float regionAoEnabled;
      uniform float regionHistoricalTone;
      uniform float regionHistoricalMode;
      uniform float regionAerialOpacity;
      uniform vec3 regionHistoricalLow;
      uniform vec3 regionHistoricalMiddle;
      uniform vec3 regionHistoricalHigh;
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
      float historicalHeight = clamp(vRegionHeight, 0.0, 1.0);
      vec3 historicalColor = historicalHeight < 0.56
        ? mix(regionHistoricalLow, regionHistoricalMiddle, historicalHeight / 0.56)
        : mix(regionHistoricalMiddle, regionHistoricalHigh, (historicalHeight - 0.56) / 0.44);
      float archivalVariation = (vRegionVariation - 0.5) * 0.035;
      historicalColor += vec3(archivalVariation, archivalVariation * 0.78, archivalVariation * 0.42);
      float historicalReliefLift = step(1.5, regionHistoricalMode) * 0.035;
      historicalColor *= 1.0 + historicalReliefLift;
      diffuseColor.rgb = mix(diffuseColor.rgb, historicalColor, regionHistoricalTone * 0.88);
      // The aerial slot remains deliberately empty while the source-rights gate is blocked.
      float sourcePixelsAvailable = 0.0;
      diffuseColor.rgb = mix(diffuseColor.rgb, historicalColor, sourcePixelsAvailable * regionAerialOpacity);
      float contour = 1.0 - smoothstep(0.0, 0.07, abs(fract(vRegionHeight * 11.0) - 0.5));
      float contourStrength = regionContourMode < 0.5 ? 0.0 : regionContourMode < 1.5 ? 0.12 : 0.24;
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.48, 0.46, 0.34), contour * contourStrength);
      diffuseColor.rgb *= mix(0.96, 1.0, regionAoEnabled);
    `);
  };
  material.customProgramCacheKey = () => 'v2-region-terrain-material-2';
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
    quality: 'A',
    grid: `${asset.grid.width}×${asset.grid.height}`,
    coastlineResolution: '196×100 grid mask / OSM polygon test',
    sourceLabel: asset.source.title,
    assetPayloadBytes: 86_295,
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
    setVerticalExaggeration(nextVerticalExaggeration) {
      verticalExaggeration = nextVerticalExaggeration;
      const position = built.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let index = 0; index < built.elevations.length; index += 1) {
        position.setY(index, Math.max(0, built.elevations[index]) * verticalExaggeration * REGION_CONFIG.worldUnitsPerMetre);
      }
      position.needsUpdate = true;
      built.geometry.computeVertexNormals();
      built.geometry.computeBoundingSphere();
      uniforms.maxElevation.value = REGION_CONFIG.terrain.maxElevationWorld * verticalExaggeration / baseVerticalExaggeration;
      wireframe.geometry.dispose();
      wireframe.geometry = new THREE.WireframeGeometry(built.geometry);
    },
    setLightingMode(_mode) {
      // Gate A keeps its existing lighting path; the relief switch is applied by RegionAtmosphere.
    },
    setContourMode(mode) {
      uniforms.contourMode.value = mode === 'OFF' ? 0 : mode === 'STRONG' ? 2 : 1;
    },
    setAoEnabled(enabled) {
      uniforms.aoEnabled.value = enabled ? 1 : 0;
    },
    setCoastDebug(_enabled) {
      // Gate A remains the immutable grid-mask baseline; B/C own the coast debug view.
    },
    setHistoricalToneEnabled(enabled) {
      uniforms.historicalTone.value = enabled ? 1 : 0;
    },
    setHistoricalMode(mode) {
      uniforms.historicalMode.value = historicalModeIndex(mode);
    },
    setAerialOpacity(opacity) {
      uniforms.aerialOpacity.value = Math.min(100, Math.max(0, opacity)) / 100;
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
