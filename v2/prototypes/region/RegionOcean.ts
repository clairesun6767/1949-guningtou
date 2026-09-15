import * as THREE from 'three';
import {
  REGION_CONFIG,
  REGION_VARIANTS,
  type RegionPerformanceTier,
  type RegionTerrainQualityId,
  type RegionVariantId,
} from '../../config/region.js';
import { tierSettings } from './RegionPerformance.js';

export interface RegionOceanHandle {
  mesh: THREE.Mesh;
  setVisible(visible: boolean): void;
  setVariant(variant: RegionVariantId): void;
  setTerrainQuality(quality: RegionTerrainQualityId): void;
  tick(now: number): void;
  dispose(): void;
}

function colorValue(hex: string) {
  return new THREE.Color(hex);
}

export function createRegionOcean(tier: RegionPerformanceTier): RegionOceanHandle {
  const settings = tierSettings(tier);
  const segments = settings.oceanSegments;
  const geometry = new THREE.PlaneGeometry(160, 112, segments, Math.max(8, Math.round(segments * 0.65)));
  const uniforms = {
    time: { value: 0 },
    deep: { value: colorValue(REGION_VARIANTS.neutral.oceanDeep) },
    shallow: { value: colorValue(REGION_VARIANTS.neutral.oceanShallow) },
    qualityMode: { value: 0 },
    sunDirection: { value: new THREE.Vector3(-0.42, 0.86, 0.28).normalize() },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: false,
    depthWrite: true,
    side: THREE.DoubleSide,
    vertexShader: `
      uniform float time;
      uniform vec3 sunDirection;
      varying vec2 vOceanUv;
      varying float vWave;
      varying float vOceanFresnel;
      varying float vOceanSunResponse;
      void main() {
        vOceanUv = uv;
        vec3 transformed = position;
        float wave = sin(position.x * 0.19 + time * 0.00075) * 0.025
          + cos(position.y * 0.27 - time * 0.00055) * 0.018
          + sin((position.x + position.y) * 0.08 + time * 0.00035) * 0.012;
        transformed.z += wave;
        vWave = wave;
        vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
        vec3 worldNormal = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0));
        vec3 viewDirection = normalize(cameraPosition - worldPosition.xyz);
        vOceanFresnel = pow(1.0 - max(dot(worldNormal, viewDirection), 0.0), 3.0);
        vOceanSunResponse = pow(max(dot(reflect(-sunDirection, worldNormal), viewDirection), 0.0), 28.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 deep;
      uniform vec3 shallow;
      uniform float time;
      uniform float qualityMode;
      varying vec2 vOceanUv;
      varying float vWave;
      varying float vOceanFresnel;
      varying float vOceanSunResponse;
      void main() {
        float depth = smoothstep(0.0, 1.0, 1.0 - vOceanUv.y);
        vec3 base = mix(shallow, deep, depth * 0.83 + 0.08);
        float bands = sin(vOceanUv.x * 46.0 + time * 0.00045 + vOceanUv.y * 11.0) * 0.5 + 0.5;
        float glint = pow(max(0.0, bands), 16.0) * 0.07;
        float variation = sin(vOceanUv.x * 12.0) * cos(vOceanUv.y * 17.0) * 0.018;
        float qualitySurface = qualityMode * (vOceanFresnel * 0.035 + vOceanSunResponse * 0.045);
        gl_FragColor = vec4(base + vec3(glint + variation + qualitySurface) + vWave * 0.22, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `v2-region-ocean-${tier.toLowerCase()}`;
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = REGION_CONFIG.terrain.seaLevelWorld;
  mesh.receiveShadow = true;
  return {
    mesh,
    setVisible(visible) {
      mesh.visible = visible;
    },
    setVariant(variant) {
      const palette = REGION_VARIANTS[variant];
      uniforms.deep.value.copy(colorValue(palette.oceanDeep));
      uniforms.shallow.value.copy(colorValue(palette.oceanShallow));
    },
    setTerrainQuality(quality) {
      uniforms.qualityMode.value = quality === 'A' ? 0 : 1;
    },
    tick(now) {
      uniforms.time.value = now;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
