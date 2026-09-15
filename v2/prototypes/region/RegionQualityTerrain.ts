import * as THREE from 'three';
import {
  HISTORICAL_ART_PALETTE,
  type HistoricalAerialMode,
} from '../../config/historicalAerial.js';
import {
  REGION_COMPOSITION_FOG,
  REGION_CONFIG,
  REGION_VARIANTS,
  type RegionLightingMode,
  type RegionTerrainQualityId,
  type RegionVariantId,
} from '../../config/region.js';
import type { GeographicBounds } from '../../config/region.js';
import type { CloudShadowState } from '../../environment/RegionCloudShadow.js';
import { REGION_CLOUD_DENSITY_GLSL } from '../../environment/RegionCloudShadow.js';
import { lonLatToWorld } from '../../shared/geo.js';
import type { RegionCoastlineAsset, RegionQualityTerrainAsset } from '../../shared/regionDataProvider.js';
import type { RegionAerialBinding, RegionTerrainHandle, RegionTerrainTextures } from './RegionTerrain.js';

type LonLat = [number, number];
type QualityId = Exclude<RegionTerrainQualityId, 'A'>;

const DEFAULT_COAST_MASK_WIDTH = 2048;
const DEFAULT_COAST_MASK_HEIGHT = 1041;
const QUALITY_PAYLOAD_BYTES: Record<QualityId, number> = { B: 308_086, C: 1_227_710 };
const COMPOSITION_PAYLOAD_BYTES: Record<QualityId, number> = { B: 605_462, C: 2_414_211 };

function coastlineMaskSize(asset: RegionQualityTerrainAsset) {
  return {
    width: Math.max(1, Math.floor(asset.derivation.coastlineWidth ?? DEFAULT_COAST_MASK_WIDTH)),
    height: Math.max(1, Math.floor(asset.derivation.coastlineHeight ?? DEFAULT_COAST_MASK_HEIGHT)),
  };
}

function polygons(asset: RegionCoastlineAsset): LonLat[][][] {
  const result: LonLat[][][] = [];
  for (const feature of asset.features) {
    if (feature.geometry.type === 'Polygon') {
      result.push(feature.geometry.coordinates as LonLat[][]);
    } else {
      result.push(...(feature.geometry.coordinates as LonLat[][][]));
    }
  }
  return result.filter(polygon => polygon.some(ring => ring.length >= 3));
}

function createCoastMask(
  coastline: RegionCoastlineAsset,
  bounds: RegionQualityTerrainAsset['bounds'],
  maskSize: { width: number; height: number },
) {
  const canvas = document.createElement('canvas');
  canvas.width = maskSize.width;
  canvas.height = maskSize.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D is unavailable for the Gate A.1 coastline mask.');
  context.fillStyle = '#000';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#fff';
  context.beginPath();
  for (const polygon of polygons(coastline)) {
    for (const ring of polygon) {
      for (let index = 0; index < ring.length; index += 1) {
        const [longitude, latitude] = ring[index];
        const x = ((longitude - bounds.west) / (bounds.east - bounds.west)) * canvas.width;
        const y = ((bounds.north - latitude) / (bounds.north - bounds.south)) * canvas.height;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.closePath();
    }
  }
  context.fill('evenodd');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.flipY = true;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function sourceHeight(asset: RegionQualityTerrainAsset, row: number, column: number) {
  const safeRow = Math.max(0, Math.min(asset.grid.height - 1, row));
  const safeColumn = Math.max(0, Math.min(asset.grid.width - 1, column));
  return asset.heights[safeRow * asset.grid.width + safeColumn] ?? 0;
}

function coordinatePointCount(value: unknown): number {
  if (!Array.isArray(value) || value.length === 0) return 0;
  if (typeof value[0] === 'number') return 1;
  return value.reduce((count, next) => count + coordinatePointCount(next), 0);
}

function baseTerrainColor(height: number, maxHeight: number, index: number) {
  const low = new THREE.Color('#4e6357');
  const middle = new THREE.Color('#87916d');
  const high = new THREE.Color('#c9b17c');
  const normalized = Math.min(1, Math.max(0, height / Math.max(maxHeight, 1)));
  const color = normalized < 0.55
    ? low.clone().lerp(middle, normalized / 0.55)
    : middle.clone().lerp(high, (normalized - 0.55) / 0.45);
  const grain = ((index * 29) % 37) / 37 - 0.5;
  color.multiplyScalar(1 + grain * 0.035);
  return color;
}

function createGeometry(asset: RegionQualityTerrainAsset, verticalExaggeration: number) {
  const { width, height } = asset.grid;
  const vertexCount = width * height;
  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const slopes = new Float32Array(vertexCount);
  const aspects = new Float32Array(vertexCount);
  const variations = new Float32Array(vertexCount);
  const elevations = new Float32Array(vertexCount);
  const longitudeMetres = (asset.bounds.east - asset.bounds.west) * 111_320 * Math.cos((24.49 * Math.PI) / 180);
  const latitudeMetres = (asset.bounds.north - asset.bounds.south) * 110_540;
  const sampleWidthMetres = longitudeMetres / Math.max(1, width - 1);
  const sampleHeightMetres = latitudeMetres / Math.max(1, height - 1);

  for (let row = 0; row < height; row += 1) {
    const latitude = asset.bounds.north - (row / (height - 1)) * (asset.bounds.north - asset.bounds.south);
    for (let column = 0; column < width; column += 1) {
      const index = row * width + column;
      const longitude = asset.bounds.west + (column / (width - 1)) * (asset.bounds.east - asset.bounds.west);
      const sample = Math.max(0, sourceHeight(asset, row, column));
      const point = lonLatToWorld({ longitude, latitude }, sample * verticalExaggeration * REGION_CONFIG.worldUnitsPerMetre);
      positions[index * 3] = point.x;
      positions[index * 3 + 1] = point.y;
      positions[index * 3 + 2] = point.z;
      elevations[index] = sample;
      const color = baseTerrainColor(sample, asset.derivation.maxElevationMetres, index);
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
      uvs[index * 2] = column / (width - 1);
      uvs[index * 2 + 1] = 1 - row / (height - 1);

      const eastSlope = (sourceHeight(asset, row, column + 1) - sourceHeight(asset, row, column - 1)) / Math.max(1, 2 * sampleWidthMetres);
      const northSlope = (sourceHeight(asset, row - 1, column) - sourceHeight(asset, row + 1, column)) / Math.max(1, 2 * sampleHeightMetres);
      slopes[index] = Math.min(1, Math.hypot(eastSlope, northSlope));
      aspects[index] = (Math.atan2(northSlope, eastSlope) + Math.PI) / (Math.PI * 2);
      variations[index] = Math.sin((longitude - 118) * 13.7 + (latitude - 24.5) * 11.2) * 0.5 + 0.5;
    }
  }

  const triangleCount = (width - 1) * (height - 1) * 2;
  const indices = new Uint32Array(triangleCount * 3);
  let indexOffset = 0;
  for (let row = 0; row < height - 1; row += 1) {
    for (let column = 0; column < width - 1; column += 1) {
      const a = row * width + column;
      const b = a + 1;
      const c = a + width;
      const d = c + 1;
      indices[indexOffset] = a;
      indices[indexOffset + 1] = c;
      indices[indexOffset + 2] = b;
      indices[indexOffset + 3] = b;
      indices[indexOffset + 4] = c;
      indices[indexOffset + 5] = d;
      indexOffset += 6;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setAttribute('regionSlope', new THREE.BufferAttribute(slopes, 1));
  geometry.setAttribute('regionAspect', new THREE.BufferAttribute(aspects, 1));
  geometry.setAttribute('regionVariation', new THREE.BufferAttribute(variations, 1));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return { geometry, elevations, triangles: triangleCount, vertices: vertexCount };
}

function variantIndex(variant: RegionVariantId) {
  return variant === 'cinematic' ? 1 : variant === 'historical' ? 2 : 0;
}

function historicalModeIndex(mode: HistoricalAerialMode) {
  return mode === 'AERIAL' ? 1 : mode === 'AERIAL_RELIEF' ? 2 : 0;
}

function aerialUvBoundsFor(terrainBounds: GeographicBounds, aerialBounds: GeographicBounds) {
  const longitudeSpan = Math.max(0.0001, terrainBounds.east - terrainBounds.west);
  const latitudeSpan = Math.max(0.0001, terrainBounds.north - terrainBounds.south);
  return new THREE.Vector4(
    (aerialBounds.west - terrainBounds.west) / longitudeSpan,
    (terrainBounds.north - aerialBounds.north) / latitudeSpan,
    (aerialBounds.east - terrainBounds.west) / longitudeSpan,
    (terrainBounds.north - aerialBounds.south) / latitudeSpan,
  );
}

export function createRegionQualityTerrain(
  asset: RegionQualityTerrainAsset,
  coastline: RegionCoastlineAsset,
  textures: RegionTerrainTextures,
  options: {
    verticalExaggeration?: number;
    historicalToneEnabled?: boolean;
    historicalMode?: HistoricalAerialMode;
    aerialOpacity?: number;
  } = {},
): RegionTerrainHandle {
  const quality = asset.quality as QualityId;
  const isComposition = asset.id.includes('composition');
  let verticalExaggeration = options.verticalExaggeration ?? 1.5;
  let lightingMode: RegionLightingMode = 'RELIEF';
  const maskSize = coastlineMaskSize(asset);
  const coastMask = createCoastMask(coastline, asset.bounds, maskSize);
  const built = createGeometry(asset, verticalExaggeration);
  const compositionFogCenter = lonLatToWorld(REGION_COMPOSITION_FOG.center);
  const group = new THREE.Group();
  group.name = `v2-region-terrain-${quality.toLowerCase()}`;
  const uniforms = {
    classificationA: { value: textures.classificationA },
    classificationB: { value: textures.classificationB },
    coastMask: { value: coastMask },
    textureEnabled: { value: 1 },
    variant: { value: 0 },
    maxElevation: { value: asset.derivation.maxElevationMetres * verticalExaggeration * REGION_CONFIG.worldUnitsPerMetre },
    contourMode: { value: 1 },
    aoEnabled: { value: 1 },
    coastDebug: { value: 0 },
    lightingMode: { value: 1 },
    historicalTone: { value: options.historicalToneEnabled ? 1 : 0 },
    historicalMode: { value: historicalModeIndex(options.historicalMode ?? 'OFF') },
    aerialOpacity: { value: Math.min(100, Math.max(0, options.aerialOpacity ?? 0)) / 100 },
    historicalLow: { value: new THREE.Color(HISTORICAL_ART_PALETTE.low) },
    historicalMiddle: { value: new THREE.Color(HISTORICAL_ART_PALETTE.middle) },
    historicalHigh: { value: new THREE.Color(HISTORICAL_ART_PALETTE.high) },
    historicalAerialTexture: { value: textures.classificationA },
    aerialUvBounds: { value: new THREE.Vector4(0, 0, 1, 1) },
    aerialAvailable: { value: 0 },
    coverageMaskDebug: { value: 0 },
    cloudShadowEnabled: { value: 0 },
    cloudShadowCoverage: { value: 0 },
    cloudShadowStrength: { value: 0 },
    cloudShadowOffset: { value: new THREE.Vector2() },
    cloudShadowWindDirection: { value: new THREE.Vector2(0.86, 0.5) },
    cloudShadowWindSpeed: { value: 0.42 },
    cloudShadowTime: { value: 0 },
    compositionFogCenter: { value: new THREE.Vector2(compositionFogCenter.x, compositionFogCenter.z) },
    compositionFogInnerRadius: { value: REGION_COMPOSITION_FOG.innerRadiusWorld },
    compositionFogOuterRadius: { value: REGION_COMPOSITION_FOG.outerRadiusWorld },
    compositionFogColor: { value: new THREE.Color(REGION_VARIANTS.neutral.fog) },
    compositionFogColorMix: { value: isComposition ? REGION_COMPOSITION_FOG.colorMix : 0 },
    compositionFogOpacity: { value: isComposition ? REGION_COMPOSITION_FOG.opacity : 0 },
  };
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    metalness: 0.015,
    flatShading: false,
    transparent: isComposition,
    depthWrite: !isComposition,
    alphaTest: isComposition ? 0 : 0.48,
  });
  material.onBeforeCompile = shader => {
    shader.uniforms.regionClassificationA = uniforms.classificationA;
    shader.uniforms.regionClassificationB = uniforms.classificationB;
    shader.uniforms.regionCoastMask = uniforms.coastMask;
    shader.uniforms.regionTextureEnabled = uniforms.textureEnabled;
    shader.uniforms.regionVariant = uniforms.variant;
    shader.uniforms.regionMaxElevation = uniforms.maxElevation;
    shader.uniforms.regionContourMode = uniforms.contourMode;
    shader.uniforms.regionAoEnabled = uniforms.aoEnabled;
    shader.uniforms.regionCoastDebug = uniforms.coastDebug;
    shader.uniforms.regionLightingMode = uniforms.lightingMode;
    shader.uniforms.regionHistoricalTone = uniforms.historicalTone;
    shader.uniforms.regionHistoricalMode = uniforms.historicalMode;
    shader.uniforms.regionAerialOpacity = uniforms.aerialOpacity;
    shader.uniforms.regionHistoricalLow = uniforms.historicalLow;
    shader.uniforms.regionHistoricalMiddle = uniforms.historicalMiddle;
    shader.uniforms.regionHistoricalHigh = uniforms.historicalHigh;
    shader.uniforms.regionHistoricalAerialTexture = uniforms.historicalAerialTexture;
    shader.uniforms.regionAerialUvBounds = uniforms.aerialUvBounds;
    shader.uniforms.regionAerialAvailable = uniforms.aerialAvailable;
    shader.uniforms.regionCoverageMaskDebug = uniforms.coverageMaskDebug;
    shader.uniforms.regionCloudShadowEnabled = uniforms.cloudShadowEnabled;
    shader.uniforms.regionCloudShadowCoverage = uniforms.cloudShadowCoverage;
    shader.uniforms.regionCloudShadowStrength = uniforms.cloudShadowStrength;
    shader.uniforms.regionCloudShadowOffset = uniforms.cloudShadowOffset;
    shader.uniforms.regionCloudShadowWindDirection = uniforms.cloudShadowWindDirection;
    shader.uniforms.regionCloudShadowWindSpeed = uniforms.cloudShadowWindSpeed;
    shader.uniforms.regionCloudShadowTime = uniforms.cloudShadowTime;
    shader.uniforms.regionCompositionFogCenter = uniforms.compositionFogCenter;
    shader.uniforms.regionCompositionFogInnerRadius = uniforms.compositionFogInnerRadius;
    shader.uniforms.regionCompositionFogOuterRadius = uniforms.compositionFogOuterRadius;
    shader.uniforms.regionCompositionFogColor = uniforms.compositionFogColor;
    shader.uniforms.regionCompositionFogColorMix = uniforms.compositionFogColorMix;
    shader.uniforms.regionCompositionFogOpacity = uniforms.compositionFogOpacity;
    shader.vertexShader = `
      uniform float regionMaxElevation;
      attribute float regionSlope;
      attribute float regionAspect;
      attribute float regionVariation;
      varying vec2 vRegionUv;
      varying float vRegionHeight;
      varying float vRegionSlope;
      varying float vRegionAspect;
      varying float vRegionVariation;
      varying vec2 vRegionPlanarPosition;
      ${shader.vertexShader}
    `
      .replace('#include <uv_vertex>', '#include <uv_vertex>\n    vRegionUv = uv;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
    vRegionHeight = clamp(position.y / regionMaxElevation, 0.0, 1.0);
    vRegionSlope = regionSlope;
    vRegionAspect = regionAspect;
    vRegionVariation = regionVariation;
    vRegionPlanarPosition = transformed.xz;`);
    shader.fragmentShader = `
      varying vec2 vRegionUv;
      varying float vRegionHeight;
      varying float vRegionSlope;
      varying float vRegionAspect;
      varying float vRegionVariation;
      varying vec2 vRegionPlanarPosition;
      uniform sampler2D regionClassificationA;
      uniform sampler2D regionClassificationB;
      uniform sampler2D regionCoastMask;
      uniform float regionTextureEnabled;
      uniform float regionVariant;
      uniform float regionContourMode;
      uniform float regionAoEnabled;
      uniform float regionCoastDebug;
      uniform float regionLightingMode;
      uniform float regionHistoricalTone;
      uniform float regionHistoricalMode;
      uniform float regionAerialOpacity;
      uniform vec3 regionHistoricalLow;
      uniform vec3 regionHistoricalMiddle;
      uniform vec3 regionHistoricalHigh;
      uniform sampler2D regionHistoricalAerialTexture;
      uniform vec4 regionAerialUvBounds;
      uniform float regionAerialAvailable;
      uniform float regionCoverageMaskDebug;
      uniform float regionCloudShadowEnabled;
      uniform float regionCloudShadowCoverage;
      uniform float regionCloudShadowStrength;
      uniform vec2 regionCloudShadowOffset;
      uniform vec2 regionCloudShadowWindDirection;
      uniform float regionCloudShadowWindSpeed;
      uniform float regionCloudShadowTime;
      ${REGION_CLOUD_DENSITY_GLSL}
      uniform vec2 regionCompositionFogCenter;
      uniform float regionCompositionFogInnerRadius;
      uniform float regionCompositionFogOuterRadius;
      uniform vec3 regionCompositionFogColor;
      uniform float regionCompositionFogColorMix;
      uniform float regionCompositionFogOpacity;
      ${shader.fragmentShader}
    `
      .replace('#include <color_fragment>', `
      #include <color_fragment>
      float regionCoastValue = texture2D(regionCoastMask, vRegionUv).r;
      float regionSlopeShade = mix(1.0, 0.84, clamp(vRegionSlope, 0.0, 1.0));
      float regionAspectShade = mix(0.98, mix(0.88, 1.1, vRegionAspect), regionLightingMode);
      float regionVariationShade = (vRegionVariation - 0.5) * 0.055;
      diffuseColor.rgb *= regionSlopeShade * regionAspectShade;
      diffuseColor.rgb += vec3(regionVariationShade, regionVariationShade * 0.82, regionVariationShade * 0.48);
      vec3 regionMaskA = texture2D(regionClassificationA, vRegionUv).rgb;
      vec3 regionMaskB = texture2D(regionClassificationB, vRegionUv).rgb;
      float vegetation = regionMaskA.g * 0.085;
      float agriculture = regionMaskA.r * 0.06;
      float settlement = regionMaskA.b * 0.05;
      float beach = regionMaskB.r * 0.05;
      diffuseColor.rgb *= 1.0 + regionTextureEnabled * (vegetation + agriculture + settlement + beach);
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.12, 0.88, 0.75), regionVariant * 0.22);
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.1, 1.04, 0.82), step(1.5, regionVariant) * 0.24);
      float historicalHeight = clamp(vRegionHeight, 0.0, 1.0);
      vec3 historicalColor = historicalHeight < 0.56
        ? mix(regionHistoricalLow, regionHistoricalMiddle, historicalHeight / 0.56)
        : mix(regionHistoricalMiddle, regionHistoricalHigh, (historicalHeight - 0.56) / 0.44);
      float archivalVariation = (vRegionVariation - 0.5) * 0.035;
      historicalColor += vec3(archivalVariation, archivalVariation * 0.78, archivalVariation * 0.42);
      historicalColor *= 1.0 + step(1.5, regionHistoricalMode) * 0.035;
      diffuseColor.rgb = mix(diffuseColor.rgb, historicalColor, regionHistoricalTone * 0.88);
      vec2 aerialSpan = max(regionAerialUvBounds.zw - regionAerialUvBounds.xy, vec2(0.0001));
      vec2 aerialUv = (vRegionUv - regionAerialUvBounds.xy) / aerialSpan;
      float aerialEdge = min(min(aerialUv.x, 1.0 - aerialUv.x), min(aerialUv.y, 1.0 - aerialUv.y));
      float aerialCoverage = smoothstep(-0.035, 0.065, aerialEdge);
      vec4 aerialSample = texture2D(regionHistoricalAerialTexture, aerialUv);
      vec3 aerialColor = mix(historicalColor, aerialSample.rgb, aerialSample.a);
      float sourcePixelsAvailable = regionAerialAvailable;
      vec3 aerialPresentation = mix(aerialColor, mix(aerialColor, historicalColor, 0.18), step(1.5, regionHistoricalMode));
      diffuseColor.rgb = mix(diffuseColor.rgb, aerialPresentation, sourcePixelsAvailable * regionAerialOpacity * aerialCoverage);
      if (regionCoverageMaskDebug > 0.5) {
        float coverageLine = 1.0 - smoothstep(0.0, 0.035, abs(aerialEdge));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.88, 0.48, 0.24), coverageLine);
      }
      vec2 cloudPoint = vRegionPlanarPosition + regionCloudShadowOffset
        + regionCloudShadowWindDirection * regionCloudShadowTime * regionCloudShadowWindSpeed * 0.00008;
      float cloudDensity = regionEnvCloudDensity(cloudPoint * 0.026, regionCloudShadowCoverage);
      float cloudDarkening = regionCloudShadowEnabled * cloudDensity * regionCloudShadowStrength;
      diffuseColor.rgb *= 1.0 - cloudDarkening * 0.38;
      float contour = 1.0 - smoothstep(0.0, 0.07, abs(fract(vRegionHeight * 13.0) - 0.5));
      float contourStrength = regionContourMode < 0.5 ? 0.0 : regionContourMode < 1.5 ? 0.085 : 0.2;
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.46, 0.44, 0.31), contour * contourStrength);
      diffuseColor.rgb *= mix(1.0, 0.965, regionAoEnabled * clamp(vRegionSlope + (1.0 - vRegionHeight) * 0.12, 0.0, 1.0));
      float coastEdge = 1.0 - smoothstep(0.48, 0.72, regionCoastValue);
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.16, 1.05, 0.84), coastEdge * 0.12);
      float compositionFogDistance = distance(vRegionPlanarPosition, regionCompositionFogCenter);
      float compositionFog = smoothstep(regionCompositionFogInnerRadius, regionCompositionFogOuterRadius, compositionFogDistance);
      diffuseColor.rgb = mix(diffuseColor.rgb, regionCompositionFogColor, compositionFog * regionCompositionFogColorMix);
      diffuseColor.a *= 1.0 - compositionFog * regionCompositionFogOpacity;
      if (regionCoastDebug > 0.5) diffuseColor.rgb = mix(vec3(0.08, 0.72, 0.62), diffuseColor.rgb, smoothstep(0.48, 0.68, regionCoastValue));
    `)
      .replace('#include <alphatest_fragment>', `
      float regionCoastAlpha = texture2D(regionCoastMask, vRegionUv).r;
      if (regionCoastAlpha < 0.48) discard;
      #include <alphatest_fragment>
    `);
  };
  material.customProgramCacheKey = () => 'v2-region-quality-terrain-material-3';
  const mesh = new THREE.Mesh(built.geometry, material);
  mesh.name = `v2-region-terrain-${quality.toLowerCase()}-mesh`;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  const wireframeMaterial = new THREE.LineBasicMaterial({ color: '#e5c988', transparent: true, opacity: 0.3, depthTest: false });
  const wireframe = new THREE.LineSegments(new THREE.BufferGeometry(), wireframeMaterial);
  wireframe.name = `v2-region-terrain-${quality.toLowerCase()}-wireframe`;
  wireframe.visible = false;
  wireframe.renderOrder = 10;
  group.add(wireframe);

  function refreshWireframe() {
    wireframe.geometry.dispose();
    wireframe.geometry = new THREE.WireframeGeometry(built.geometry);
  }

  return {
    group,
    mesh,
    wireframe,
    quality,
    grid: `${asset.grid.width}×${asset.grid.height}`,
    coastlineResolution: maskSize.width + '×' + maskSize.height + ' alpha mask / ' + coastline.features.reduce((count, feature) => count + coordinatePointCount(feature.geometry.coordinates), 0).toLocaleString() + ' OSM vector points',
    sourceLabel: asset.source.title,
    assetPayloadBytes: isComposition ? COMPOSITION_PAYLOAD_BYTES[quality] : QUALITY_PAYLOAD_BYTES[quality],
    triangles: built.triangles,
    vertices: built.vertices,
    textureEstimateBytes: 3 * maskSize.width * maskSize.height * 4,
    setTextures(nextTextures) {
      uniforms.classificationA.value = nextTextures.classificationA;
      uniforms.classificationB.value = nextTextures.classificationB;
    },
    setTextureEnabled(enabled) {
      uniforms.textureEnabled.value = enabled ? 1 : 0;
    },
    setVariant(variant) {
      uniforms.variant.value = variantIndex(variant);
      uniforms.compositionFogColor.value.set(REGION_VARIANTS[variant].fog);
    },
    setWireframe(enabled) {
      if (enabled && wireframe.geometry.getAttribute('position') === undefined) refreshWireframe();
      wireframe.visible = enabled;
    },
    setVerticalExaggeration(nextVerticalExaggeration) {
      verticalExaggeration = nextVerticalExaggeration;
      const position = built.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let index = 0; index < built.elevations.length; index += 1) {
        position.setY(index, built.elevations[index] * verticalExaggeration * REGION_CONFIG.worldUnitsPerMetre);
      }
      position.needsUpdate = true;
      built.geometry.computeVertexNormals();
      built.geometry.computeBoundingSphere();
      uniforms.maxElevation.value = asset.derivation.maxElevationMetres * verticalExaggeration * REGION_CONFIG.worldUnitsPerMetre;
      if (wireframe.visible) refreshWireframe();
    },
    setLightingMode(mode) {
      lightingMode = mode;
      uniforms.lightingMode.value = lightingMode === 'RELIEF' ? 1 : 0;
    },
    setContourMode(mode) {
      uniforms.contourMode.value = mode === 'OFF' ? 0 : mode === 'STRONG' ? 2 : 1;
    },
    setAoEnabled(enabled) {
      uniforms.aoEnabled.value = enabled ? 1 : 0;
    },
    setCoastDebug(enabled) {
      uniforms.coastDebug.value = enabled ? 1 : 0;
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
    setAerialTexture(binding: RegionAerialBinding | null) {
      uniforms.historicalAerialTexture.value = binding?.texture ?? textures.classificationA;
      uniforms.aerialAvailable.value = binding?.available ? 1 : 0;
      uniforms.aerialUvBounds.value.copy(binding ? aerialUvBoundsFor(asset.bounds, binding.bounds) : new THREE.Vector4(0, 0, 1, 1));
    },
    setCoverageMaskDebug(enabled) {
      uniforms.coverageMaskDebug.value = enabled ? 1 : 0;
    },
    setCloudShadow(state: CloudShadowState) {
      uniforms.cloudShadowEnabled.value = state.enabled ? 1 : 0;
      uniforms.cloudShadowCoverage.value = state.coverage;
      uniforms.cloudShadowStrength.value = state.strength;
      uniforms.cloudShadowOffset.value.set(state.offset.x, state.offset.y);
      uniforms.cloudShadowWindDirection.value.set(state.windDirection.x, state.windDirection.y);
      uniforms.cloudShadowWindSpeed.value = state.windSpeed;
      uniforms.cloudShadowTime.value = state.time;
    },
    setCloudShadowTime(time) {
      uniforms.cloudShadowTime.value = Number.isFinite(time) ? time : 0;
    },
    dispose() {
      built.geometry.dispose();
      material.dispose();
      coastMask.dispose();
      wireframe.geometry.dispose();
      wireframe.material.dispose();
    },
  };
}
