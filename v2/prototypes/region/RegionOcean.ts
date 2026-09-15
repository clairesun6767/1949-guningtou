import * as THREE from 'three';
import {
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
  tick(now: number, cameraPosition?: THREE.Vector3): void;
  dispose(): void;
}

function colorValue(hex: string) {
  return new THREE.Color(hex);
}

export function createRegionOcean(tier: RegionPerformanceTier): RegionOceanHandle {
  const settings = tierSettings(tier);
  const segments = settings.oceanSegments;
  const geometry = new THREE.SphereGeometry(150, Math.max(24, segments * 2), Math.max(12, segments));
  const uniforms = {
    time: { value: 0 },
    deep: { value: colorValue(REGION_VARIANTS.neutral.oceanDeep) },
    shallow: { value: colorValue(REGION_VARIANTS.neutral.oceanShallow) },
    skyTop: { value: colorValue(REGION_VARIANTS.neutral.skyTop) },
    skyBottom: { value: colorValue(REGION_VARIANTS.neutral.skyBottom) },
    fogColor: { value: colorValue(REGION_VARIANTS.neutral.fog) },
    sunColor: { value: colorValue(REGION_VARIANTS.neutral.sun) },
    qualityMode: { value: 0 },
    sunDirection: { value: new THREE.Vector3(-0.42, 0.86, 0.28).normalize() },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: false,
    depthWrite: false,
    depthTest: false,
    side: THREE.BackSide,
    toneMapped: false,
    vertexShader: `
      varying vec3 vAtmosphereDirection;
      void main() {
        vAtmosphereDirection = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 deep;
      uniform vec3 shallow;
      uniform vec3 skyTop;
      uniform vec3 skyBottom;
      uniform vec3 fogColor;
      uniform vec3 sunColor;
      uniform vec3 sunDirection;
      uniform float qualityMode;
      varying vec3 vAtmosphereDirection;
      void main() {
        vec3 direction = normalize(vAtmosphereDirection);
        float seaBlend = smoothstep(-0.14, 0.14, direction.y);
        float seaDepth = smoothstep(-0.96, 0.06, direction.y);
        vec3 sea = mix(deep, shallow, seaDepth);
        float skyHeight = smoothstep(-0.03, 0.92, direction.y);
        vec3 sky = mix(skyBottom, skyTop, pow(skyHeight, 0.78));
        vec3 color = mix(sea, sky, seaBlend);
        float horizonHaze = 1.0 - smoothstep(0.02, 0.46, abs(direction.y));
        color = mix(color, fogColor, horizonHaze * 0.24);

        float lowFrequencyMotion = sin(direction.x * 17.0 + time * 0.00017)
          * cos(direction.z * 13.0 - time * 0.00013) * 0.014;
        vec3 seaNormal = vec3(0.0, 1.0, 0.0);
        vec3 toViewer = normalize(-direction);
        float fresnel = pow(1.0 - max(dot(seaNormal, toViewer), 0.0), 3.0);
        float sunResponse = pow(max(dot(reflect(-sunDirection, seaNormal), toViewer), 0.0), 30.0);
        float sunGlow = pow(max(dot(direction, sunDirection), 0.0), 96.0);
        float oceanWeight = 1.0 - smoothstep(-0.02, 0.2, direction.y);
        color += oceanWeight * vec3(lowFrequencyMotion + fresnel * 0.025 + sunResponse * 0.045);
        color += sunColor * sunGlow * 0.028;
        color = mix(color, fogColor, horizonHaze * qualityMode * 0.08);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `v2-region-atmospheric-sea-shell-${tier.toLowerCase()}`;
  mesh.frustumCulled = false;
  mesh.renderOrder = -100;
  return {
    mesh,
    setVisible(visible) {
      mesh.visible = visible;
    },
    setVariant(variant) {
      const palette = REGION_VARIANTS[variant];
      uniforms.deep.value.copy(colorValue(palette.oceanDeep));
      uniforms.shallow.value.copy(colorValue(palette.oceanShallow));
      uniforms.skyTop.value.copy(colorValue(palette.skyTop));
      uniforms.skyBottom.value.copy(colorValue(palette.skyBottom));
      uniforms.fogColor.value.copy(colorValue(palette.fog));
      uniforms.sunColor.value.copy(colorValue(palette.sun));
    },
    setTerrainQuality(quality) {
      uniforms.qualityMode.value = quality === 'A' ? 0 : 1;
    },
    tick(now, cameraPosition) {
      uniforms.time.value = now;
      if (cameraPosition) mesh.position.copy(cameraPosition);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
