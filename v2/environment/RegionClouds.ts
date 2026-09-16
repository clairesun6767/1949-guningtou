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
  const geometry = new THREE.PlaneGeometry(240, 240, cloudResolution(tier), cloudResolution(tier));
  geometry.rotateX(-Math.PI / 2);
  const uniforms = {
    time: { value: 0 },
    coverage: { value: 0.42 },
    opacity: { value: 0.46 },
    altitude: { value: 18 },
    windDirection: { value: new THREE.Vector2(0.86, 0.5) },
    windSpeed: { value: 0.42 },
    sunColor: { value: new THREE.Color('#f0d7a0') },
    sunDirection: { value: new THREE.Vector3(-0.42, 0.86, 0.28).normalize() },
    skyColor: { value: new THREE.Color('#a7aaa0') },
    atmosphereDensity: { value: 0.007 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    // This is an atmospheric overlay, not a solid object in the terrain
    // depth hierarchy. Disabling depth testing prevents the close review
    // terrain from swallowing the low-altitude cloud sheet.
    depthTest: false,
    side: THREE.DoubleSide,
    fog: false,
    vertexShader: `
      varying vec3 vCloudWorldPosition;
      varying vec2 vCloudPlanePosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vCloudWorldPosition = worldPosition.xyz;
        vCloudPlanePosition = position.xz;
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
      uniform vec3 sunDirection;
      uniform vec3 skyColor;
      uniform float atmosphereDensity;
      varying vec3 vCloudWorldPosition;
      varying vec2 vCloudPlanePosition;
      ${REGION_CLOUD_DENSITY_GLSL}
      void main() {
        vec2 wind = windDirection * time * windSpeed * 0.00008;
        // 1 world unit is approximately 1 km in the regional renderer. The
        // larger field scale keeps masses legible from the strategic camera.
        vec2 fieldPoint = vCloudWorldPosition.xz * 0.055 + wind;
        float density = regionEnvCloudDensity(fieldPoint, coverage);
        float largeMass = smoothstep(0.16, 0.82, regionEnvFbm(fieldPoint * 0.38 + vec2(-5.0, 2.0)));
        float mediumBreakup = smoothstep(0.24, 0.78, regionEnvFbm(fieldPoint * 1.46 + vec2(4.0, -8.0)));
        float edge = 1.0 - smoothstep(142.0, 182.0, length(vCloudWorldPosition.xz));
        // Keep a broad deterministic sheet in addition to the FBM pockets.
        // At close review distances a single noise sample can otherwise land
        // in an empty pocket and make the whole cloud layer appear missing.
        float broadSheet = 0.5 + 0.5 * sin(fieldPoint.x * 0.74
          + sin(fieldPoint.y * 0.36) * 1.7
          + fieldPoint.y * 0.28);
        float broadMass = smoothstep(0.38, 0.68, broadSheet) * coverage * 0.9;
        float body = max(density * mix(0.46, 1.06, mediumBreakup) * mix(0.82, 1.12, largeMass), broadMass);
        float cloudFieldEdge = 1.0 - smoothstep(96.0, 132.0, length(vCloudPlanePosition));
        float alpha = clamp(body * (0.3 + opacity * 0.75) * 1.8 * mix(0.3, 1.0, cloudFieldEdge), 0.0, 0.62);
        if (alpha < 0.015) discard;
        float lightFacing = clamp(0.58 + sunDirection.y * 0.16 + density * 0.22 + largeMass * 0.08, 0.0, 1.0);
        vec3 shadowTint = mix(skyColor * 0.52, sunColor * 0.48, 0.18);
        vec3 highlightTint = mix(vec3(0.68, 0.72, 0.69), vec3(0.92, 0.9, 0.83), 0.34);
        vec3 cloudColor = mix(shadowTint, highlightTint, lightFacing);
        cloudColor = mix(cloudColor, vec3(0.82, 0.85, 0.82), atmosphereDensity * 11.0);
        cloudColor = mix(cloudColor, vec3(0.93, 0.94, 0.92), 0.62);
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
      uniforms.sunDirection.value.set(state.sunDirection.x, state.sunDirection.y, state.sunDirection.z).normalize();
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
    tick(now, cameraPosition) {
      uniforms.time.value = now;
      // Keep the atmospheric sheet above the terrain but below a close review
      // camera. The fixed 18-unit altitude is appropriate for a wide shot, but
      // it sits behind the camera during the 11.8-unit Guningtou review shot.
      if (cameraPosition) {
        mesh.position.x = cameraPosition.x;
        mesh.position.z = cameraPosition.z;
        mesh.position.y = Math.max(2.2, Math.min(uniforms.altitude.value, cameraPosition.y * 0.35));
      }
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
