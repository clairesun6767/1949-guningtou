import * as THREE from 'three';
import {
  REGION_VARIANTS,
  type RegionLightingMode,
  type RegionPerformanceTier,
  type RegionVariantId,
} from '../../config/region.js';
import { tierSettings } from './RegionPerformance.js';

export interface RegionAtmosphereHandle {
  sun: THREE.DirectionalLight;
  setVariant(variant: RegionVariantId): void;
  setFogEnabled(enabled: boolean): void;
  setShadowsEnabled(enabled: boolean): void;
  setPostProcessingEnabled(enabled: boolean): void;
  setLightingMode(mode: RegionLightingMode): void;
  setAmbientOcclusionEnabled(enabled: boolean): void;
  dispose(): void;
}

function makeSkyTexture(variant: RegionVariantId) {
  const palette = REGION_VARIANTS[variant];
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D is unavailable for the Gate A sky gradient.');
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, palette.skyTop);
  gradient.addColorStop(0.56, palette.skyBottom);
  gradient.addColorStop(1, palette.fog);
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createRegionAtmosphere(scene: THREE.Scene, renderer: THREE.WebGLRenderer, tier: RegionPerformanceTier, variant: RegionVariantId): RegionAtmosphereHandle {
  const settings = tierSettings(tier);
  const hemisphere = new THREE.HemisphereLight('#bed3cc', '#25342d', 1.4);
  hemisphere.name = `v2-region-hemisphere-${tier.toLowerCase()}`;
  const sun = new THREE.DirectionalLight(REGION_VARIANTS[variant].sun, 3.1);
  sun.name = 'v2-region-sun';
  sun.position.set(-28, 42, 22);
  sun.castShadow = settings.shadows;
  sun.shadow.mapSize.set(tier === 'HIGH' ? 1024 : 768, tier === 'HIGH' ? 1024 : 768);
  sun.shadow.camera.left = -46;
  sun.shadow.camera.right = 46;
  sun.shadow.camera.top = 36;
  sun.shadow.camera.bottom = -36;
  sun.shadow.camera.near = 0.1;
  sun.shadow.camera.far = 130;
  const ambient = new THREE.AmbientLight('#819087', 0.5);
  ambient.name = 'v2-region-ambient';
  scene.add(hemisphere, sun, ambient);
  const sky = makeSkyTexture(variant);
  scene.background = sky;
  scene.fog = new THREE.FogExp2(REGION_VARIANTS[variant].fog, settings.fogDensity);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  let activeVariant = variant;
  let lightingMode: RegionLightingMode = 'CURRENT';

  return {
    sun,
    setVariant(nextVariant) {
      const palette = REGION_VARIANTS[nextVariant];
      activeVariant = nextVariant;
      sun.color.set(palette.sun);
      hemisphere.color.set(palette.skyBottom);
      hemisphere.groundColor.set(palette.fog);
      const previous = scene.background;
      const nextSky = makeSkyTexture(nextVariant);
      scene.background = nextSky;
      if (previous instanceof THREE.Texture) previous.dispose();
      if (scene.fog instanceof THREE.FogExp2) scene.fog.color.set(palette.fog);
    },
    setFogEnabled(enabled) {
      if (enabled) {
        if (!(scene.fog instanceof THREE.FogExp2)) scene.fog = new THREE.FogExp2(REGION_VARIANTS[activeVariant].fog, settings.fogDensity);
      } else scene.fog = null;
    },
    setShadowsEnabled(enabled) {
      sun.castShadow = enabled;
      renderer.shadowMap.enabled = enabled;
    },
    setPostProcessingEnabled(enabled) {
      renderer.toneMapping = enabled ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
      renderer.toneMappingExposure = enabled ? 1.18 : 1;
    },
    setLightingMode(mode) {
      lightingMode = mode;
      if (lightingMode === 'RELIEF') {
        sun.position.set(-36, 54, 18);
        sun.intensity = 3.45;
      } else {
        sun.position.set(-28, 42, 22);
        sun.intensity = 3.1;
      }
      sun.shadow.camera.updateProjectionMatrix();
    },
    setAmbientOcclusionEnabled(enabled) {
      ambient.intensity = enabled ? 0.5 : 0.25;
    },
    dispose() {
      if (scene.background instanceof THREE.Texture) scene.background.dispose();
      scene.remove(hemisphere, sun, ambient);
    },
  };
}
