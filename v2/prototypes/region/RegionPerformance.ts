import type * as THREE from 'three';
import { REGION_CONFIG, REGION_PERFORMANCE_TIERS, type RegionPerformanceTier } from '../../config/region.js';
import { worldToLonLat } from '../../shared/geo.js';

export interface RegionDeviceProfile {
  mobile: boolean;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  pixelRatio?: number;
}

export function chooseRegionTier(profile: RegionDeviceProfile): RegionPerformanceTier {
  if (profile.mobile || (profile.deviceMemory ?? 8) <= 2 || (profile.hardwareConcurrency ?? 8) <= 2) return 'LOW';
  if ((profile.deviceMemory ?? 8) <= 4 || (profile.hardwareConcurrency ?? 8) <= 4 || (profile.pixelRatio ?? 1) > 2) return 'MEDIUM';
  return 'HIGH';
}

export interface RegionRenderStats {
  fps: number;
  frameTimeMs: number;
  calls: number;
  triangles: number;
  geometries: number;
  textures: number;
  textureEstimateBytes: number;
  cameraDistance: number;
  cameraPosition: string;
  cameraTarget: string;
  firstMeaningful3dMs: number | null;
  gateReadyMs: number | null;
  tier: RegionPerformanceTier;
}

export class RegionPerformanceMonitor {
  private readonly startedAt = performance.now();
  private firstMeaningful3dAt: number | null = null;
  private gateReadyAt: number | null = null;
  private frameCount = 0;
  private accumulatedFrameMs = 0;
  private lastFrameAt: number | null = null;
  private fps = 0;
  private frameTimeMs = 0;

  constructor(private readonly tier: RegionPerformanceTier) {}

  markFirstMeaningful3d() {
    if (this.firstMeaningful3dAt === null) this.firstMeaningful3dAt = performance.now();
  }

  markGateReady() {
    if (this.gateReadyAt === null) this.gateReadyAt = performance.now();
  }

  sample(now: number) {
    if (this.lastFrameAt !== null) {
      const delta = Math.min(100, Math.max(0.1, now - this.lastFrameAt));
      this.frameTimeMs = this.frameTimeMs * 0.9 + delta * 0.1;
      this.accumulatedFrameMs += delta;
      this.frameCount += 1;
      if (this.accumulatedFrameMs >= 500) {
        this.fps = (this.frameCount / this.accumulatedFrameMs) * 1000;
        this.frameCount = 0;
        this.accumulatedFrameMs = 0;
      }
    }
    this.lastFrameAt = now;
  }

  snapshot(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera, textureEstimateBytes: number): RegionRenderStats {
    const position = worldToLonLat(camera.position);
    const controlsTarget = (camera as THREE.PerspectiveCamera & { userData?: { regionTarget?: THREE.Vector3 } }).userData?.regionTarget;
    const targetPoint = controlsTarget ? worldToLonLat(controlsTarget) : position;
    return {
      fps: this.fps,
      frameTimeMs: this.frameTimeMs,
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
      textureEstimateBytes,
      cameraDistance: controlsTarget ? camera.position.distanceTo(controlsTarget) : 0,
      cameraPosition: `${position.longitude.toFixed(3)}, ${position.latitude.toFixed(3)}`,
      cameraTarget: `${targetPoint.longitude.toFixed(3)}, ${targetPoint.latitude.toFixed(3)}`,
      firstMeaningful3dMs: this.firstMeaningful3dAt === null ? null : this.firstMeaningful3dAt - this.startedAt,
      gateReadyMs: this.gateReadyAt === null ? null : this.gateReadyAt - this.startedAt,
      tier: this.tier,
    };
  }
}

export function estimateTextureBytes(width: number, height: number, count = 1) {
  return width * height * 4 * count;
}

export function tierSettings(tier: RegionPerformanceTier) {
  return REGION_PERFORMANCE_TIERS[tier];
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function regionBudgetSummary(tier: RegionPerformanceTier) {
  const settings = tierSettings(tier);
  return {
    tier,
    targetFps: 60,
    acceptableFloorFps: 45,
    initialPayloadBytes: 86_295 + 66_868 + 31_127 + 14_160,
    geometryGrid: '196×100',
    estimatedTextureBytes: estimateTextureBytes(2048, 1041, 2),
    oceanSegments: settings.oceanSegments,
    pixelRatioCap: settings.maxPixelRatio,
    shadows: settings.shadows,
  };
}

export function cameraBudgetLabel() {
  return `${REGION_CONFIG.camera.minDistance}–${REGION_CONFIG.camera.maxDistance} world units`;
}
