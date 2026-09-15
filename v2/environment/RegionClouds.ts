import * as THREE from 'three';
import type { EnvironmentState } from './EnvironmentState.js';
import { REGION_CLOUD_DENSITY_GLSL } from './RegionCloudShadow.js';
import type { RegionPerformanceTier } from '../config/region.js';
import { tierSettings } from '../prototypes/region/RegionPerformance.js';

export interface RegionCloudsHandle {
  mesh: THREE.Mesh;
  setVisible(visible: boolean): void;
  setState(state: EnvironmentState): void;
  setCoverage(coverage: number, opacity: number): void;
  setTier(tier: RegionPerformanceTier): void;
  tick(now: number, cameraPosition?: THREE.Vector3): void;
  dispose(): void;
}

function cloudResolution(tier: RegionPerformanceTier) {
  return tier === 'HIGH' ? 32 : tier === 'MEDIUM' ? 16 : 8;
}

export function createRegionClouds(tier: RegionPerformanceTier): RegionCloudsHandle {
  const settings = tierSettings(tier);
  const geometry = new THREE.PlaneGeometry(190, 190, cloudResolution(tier), cloudResolution(tier));
  geometry.rotateX(-Math.PI / 2);
  const uniforms = {
    time: { value: 0 },
    coverage: { value: 0.42 },
    opacity: { value: 0.46 },
    altitude: { value: 18 },
    windDirection: { value: new THREE.Vector2(0.86, 0.5) },
    windSpeed: { value: 0.42 },
    sunColor: { value: new THREE.Color('#f0d7a0') },
    skyColor: { value: new THREE.Color('#a7aaa0') },
    atmosphereDensity: { value: 0.007 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    fog: false,
    vertexShader: `
      varying vec3 vCloudWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vCloudWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform float coverage;
      uniform float opacity;
      uniform vec2 windDirection;
      uniform float windSpeed;
      uniform vec3 sunColor;
      uniform vec3 skyColor;
      uniform float atmosphereDensity;
      varying vec3 vCloudWorldPosition;
      ${REGION_CLOUD_DENSITY_GLSL}
      void main() {
        vec2 wind = windDirection * time * windSpeed * 0.00008;
        vec2 fieldPoint = vCloudWorldPosition.xz * 0.026 + wind;
        float density = regionEnvCloudDensity(fieldPoint, coverage);
        float edge = 1.0 - smoothstep(66.0, 96.0, length(vCloudWorldPosition.xz));
        float thin = regionEnvNoise(fieldPoint * 0.38 + vec2(4.0, -8.0));
        float alpha = density * opacity * edge * mix(0.72, 1.08, thin);
        if (alpha < 0.012) discard;
        vec3 cloudColor = mix(skyColor, sunColor, 0.26 + density * 0.18);
        cloudColor = mix(cloudColor, vec3(0.82, 0.85, 0.82), atmosphereDensity * 18.0);
        gl_FragColor = vec4(cloudColor, alpha);
      }
    `,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `v2-region-cloud-layer-${tier.toLowerCase()}`;
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  mesh.position.y = uniforms.altitude.value;
  return {
    mesh,
    setVisible(visible) {
      mesh.visible = visible;
    },
    setState(state) {
      uniforms.coverage.value = state.cloudCoverage;
      uniforms.opacity.value = state.cloudOpacity;
      uniforms.altitude.value = state.cloudAltitude;
      uniforms.windDirection.value.set(state.windDirection.x, state.windDirection.y);
      uniforms.windSpeed.value = state.windSpeed;
      uniforms.sunColor.value.set(state.sunColor);
      uniforms.atmosphereDensity.value = state.atmosphereDensity;
      mesh.position.y = state.cloudAltitude;
    },
    setCoverage(coverage, opacity) {
      uniforms.coverage.value = Math.min(1, Math.max(0, coverage));
      uniforms.opacity.value = Math.min(1, Math.max(0, opacity));
    },
    setTier(nextTier) {
      material.dithering = nextTier === 'HIGH';
      // The plane stays in world space; tier changes only affect material quality.
      void settings;
    },
    tick(now, _cameraPosition) {
      uniforms.time.value = now;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
