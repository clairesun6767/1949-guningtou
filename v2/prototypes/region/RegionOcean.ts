import * as THREE from 'three';
import {
  REGION_VARIANTS,
  type RegionPerformanceTier,
  type RegionTerrainQualityId,
  type RegionVariantId,
} from '../../config/region.js';
import type { EnvironmentState } from '../../environment/EnvironmentState.js';
import type { CloudShadowState } from '../../environment/RegionCloudShadow.js';
import { REGION_CLOUD_DENSITY_GLSL } from '../../environment/RegionCloudShadow.js';
import { tierSettings } from './RegionPerformance.js';

export interface RegionOceanHandle {
  mesh: THREE.Mesh;
  setVisible(visible: boolean): void;
  setVariant(variant: RegionVariantId): void;
  setTerrainQuality(quality: RegionTerrainQualityId): void;
  setEnhanced(enabled: boolean): void;
  setEnvironmentState(state: EnvironmentState): void;
  setCloudShadow(state: CloudShadowState): void;
  setFeature(feature: 'coastalDepth' | 'oceanMotion' | 'sunGlint', enabled: boolean): void;
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
    intermediate: { value: colorValue(REGION_VARIANTS.neutral.oceanDeep).lerp(colorValue(REGION_VARIANTS.neutral.oceanShallow), 0.46) },
    shallow: { value: colorValue(REGION_VARIANTS.neutral.oceanShallow) },
    skyTop: { value: colorValue(REGION_VARIANTS.neutral.skyTop) },
    skyBottom: { value: colorValue(REGION_VARIANTS.neutral.skyBottom) },
    fogColor: { value: colorValue(REGION_VARIANTS.neutral.fog) },
    sunColor: { value: colorValue(REGION_VARIANTS.neutral.sun) },
    qualityMode: { value: 0 },
    enhanced: { value: 0 },
    coastalDepth: { value: 1 },
    oceanMotion: { value: 1 },
    sunGlint: { value: 1 },
    cloudCoverage: { value: 0.42 },
    cloudOpacity: { value: 0.46 },
    cloudShadowEnabled: { value: 0 },
    cloudShadowStrength: { value: 0 },
    cloudShadowOffset: { value: new THREE.Vector2() },
    windDirection: { value: new THREE.Vector2(0.86, 0.5) },
    windSpeed: { value: 0.42 },
    atmosphereDensity: { value: 0.007 },
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
      uniform vec3 intermediate;
      uniform vec3 shallow;
      uniform vec3 skyTop;
      uniform vec3 skyBottom;
      uniform vec3 fogColor;
      uniform vec3 sunColor;
      uniform vec3 sunDirection;
      uniform float qualityMode;
      uniform float enhanced;
      uniform float coastalDepth;
      uniform float oceanMotion;
      uniform float sunGlint;
      uniform float cloudCoverage;
      uniform float cloudOpacity;
      uniform float cloudShadowEnabled;
      uniform float cloudShadowStrength;
      uniform vec2 cloudShadowOffset;
      uniform vec2 windDirection;
      uniform float windSpeed;
      uniform float atmosphereDensity;
      varying vec3 vAtmosphereDirection;
      ${REGION_CLOUD_DENSITY_GLSL}
      void main() {
        vec3 direction = normalize(vAtmosphereDirection);
        float seaBlend = smoothstep(-0.14, 0.14, direction.y);
        // This is an art-direction distance-to-coast proxy, not bathymetry.
        // The directional field keeps shallow bands visible around the
        // strategic islands while remaining stable for a fixed art-review
        // camera.
        float coastalArc = 0.5 + 0.5 * sin(direction.x * 3.4 - direction.z * 4.8 + 0.55);
        float coastalDistanceProxy = clamp(
          smoothstep(-0.92, 0.24, direction.y) * 0.56
          + smoothstep(0.12, 0.94, length(direction.xz)) * 0.25
          + coastalArc * 0.19,
          0.0,
          1.0
        );
        // Keep the three documentary bands ordered from open-water deep to
        // coastal shallow. The previous low-proxy shallow override flattened
        // the deep band at this fixed art-review camera.
        float shallowBand = smoothstep(0.58, 0.84, coastalDistanceProxy);
        vec3 proxySea = mix(deep, intermediate, smoothstep(0.38, 0.68, coastalDistanceProxy));
        proxySea = mix(proxySea, shallow, shallowBand);
        float seaDepth = smoothstep(-0.96, 0.06, direction.y);
        vec3 legacySea = mix(deep, shallow, seaDepth);
        vec3 sea = mix(legacySea, proxySea, coastalDepth);
        float skyHeight = smoothstep(-0.03, 0.92, direction.y);
        vec3 sky = mix(skyBottom, skyTop, pow(skyHeight, 0.78));
        vec3 color = mix(sea, sky, seaBlend);
        float horizonHaze = 1.0 - smoothstep(0.02, 0.46, abs(direction.y));
        color = mix(color, fogColor, horizonHaze * 0.24);

        float lowFrequencyMotion = sin(direction.x * 17.0 + time * 0.00017)
          * cos(direction.z * 13.0 - time * 0.00013) * 0.014;
        float strategicMotion = regionEnvFbm(direction.xz * 12.0 + windDirection * time * windSpeed * 0.00009) * 0.035;
        vec3 seaNormal = vec3(0.0, 1.0, 0.0);
        vec3 toViewer = normalize(-direction);
        float fresnel = pow(1.0 - max(dot(seaNormal, toViewer), 0.0), 3.0);
        float sunResponse = pow(max(dot(reflect(-sunDirection, seaNormal), toViewer), 0.0), 18.0);
        float sunGlow = pow(max(dot(direction, sunDirection), 0.0), 72.0);
        float oceanWeight = 1.0 - smoothstep(-0.02, 0.2, direction.y);
        float coastalTransition = smoothstep(-0.54, -0.12, direction.y) * coastalDepth;
        float roughnessVariation = regionEnvNoise(direction.xz * 9.0 + vec2(13.0, -9.0));
        float cloudField = regionEnvCloudDensity(direction.xz * 1.6 + cloudShadowOffset * 0.01 + windDirection * time * windSpeed * 0.00008, cloudCoverage);
        float projectedCloudShadow = cloudShadowEnabled * cloudField * cloudShadowStrength * oceanWeight;
        float enhancedWeight = enhanced;
        float glintNoise = regionEnvFbm(direction.xz * 18.0 + vec2(21.0, -13.0));
        float glintPattern = smoothstep(0.54, 0.82, glintNoise);
        color += oceanWeight * vec3(lowFrequencyMotion * oceanMotion + strategicMotion * enhancedWeight
          + fresnel * (0.03 + enhancedWeight * 0.04)
          + sunResponse * (0.075 + glintPattern * 0.035) * sunGlint
          + coastalTransition * 0.022
          + roughnessVariation * 0.01 * enhancedWeight);
        color += sunColor * (sunGlow * 0.038 + glintPattern * sunResponse * 0.018) * sunGlint;
        color = mix(color, fogColor, horizonHaze * (qualityMode * 0.08 + enhancedWeight * atmosphereDensity * 8.0));
        color *= 1.0 - projectedCloudShadow * 0.42;
        color = mix(color, mix(intermediate, deep, 0.35), coastalTransition * enhancedWeight * 0.12);
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
      uniforms.intermediate.value.copy(colorValue(palette.oceanDeep).lerp(colorValue(palette.oceanShallow), 0.46));
      uniforms.shallow.value.copy(colorValue(palette.oceanShallow));
      uniforms.skyTop.value.copy(colorValue(palette.skyTop));
      uniforms.skyBottom.value.copy(colorValue(palette.skyBottom));
      uniforms.fogColor.value.copy(colorValue(palette.fog));
      uniforms.sunColor.value.copy(colorValue(palette.sun));
    },
    setTerrainQuality(quality) {
      uniforms.qualityMode.value = quality === 'A' ? 0 : 1;
    },
    setEnhanced(enabled) {
      uniforms.enhanced.value = enabled ? 1 : 0;
    },
    setEnvironmentState(state) {
      uniforms.sunDirection.value.set(state.sunDirection.x, state.sunDirection.y, state.sunDirection.z).normalize();
      uniforms.sunColor.value.set(state.sunColor);
      uniforms.cloudCoverage.value = state.cloudCoverage;
      uniforms.cloudOpacity.value = state.cloudOpacity;
      uniforms.windDirection.value.set(state.windDirection.x, state.windDirection.y);
      uniforms.windSpeed.value = state.windSpeed;
      uniforms.atmosphereDensity.value = state.atmosphereDensity;
    },
    setCloudShadow(state) {
      uniforms.cloudShadowEnabled.value = state.enabled ? 1 : 0;
      uniforms.cloudShadowStrength.value = state.strength;
      uniforms.cloudShadowOffset.value.set(state.offset.x, state.offset.y);
      uniforms.cloudCoverage.value = state.coverage;
      uniforms.windDirection.value.set(state.windDirection.x, state.windDirection.y);
      uniforms.windSpeed.value = state.windSpeed;
    },
    setFeature(feature, enabled) {
      uniforms[feature].value = enabled ? 1 : 0;
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
