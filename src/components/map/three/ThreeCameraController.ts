import * as THREE from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Position } from '../../../battle-replay/types/index.js';
import { getThreeCameraDestination, wgs84ToLocalMeters } from '../../../battle-replay/visualization/adapters/threeAdapter.js';
import type { CameraPresetId } from '../../../battle-replay/visualization/types.js';
import { HistoricalTerrainStyle, type TerrainPitch } from './HistoricalTerrainStyle.js';

const SCALE = HistoricalTerrainStyle.terrain.worldUnitsPerMetre;

interface CameraTween {
  startedAt: number;
  duration: number;
  fromPosition: THREE.Vector3;
  toPosition: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
}

export interface GeographicCameraBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

const STRATEGIC_PAN_BOUNDS: GeographicCameraBounds = { west: 117.96, south: 24.33, east: 118.59, north: 24.66 };
const LOCAL_PAN_BOUNDS: GeographicCameraBounds = { west: 118.265, south: 24.415, east: 118.395, north: 24.525 };

export class ThreeCameraController {
  private tween?: CameraTween;
  private pitch: TerrainPitch = HistoricalTerrainStyle.camera.defaultPitchDegrees;
  private currentPreset: CameraPresetId = 'strategic';
  private currentFocus?: Position;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly controls: OrbitControls,
    private readonly mobile: boolean,
    private readonly reducedMotion: boolean,
  ) {}

  updateCamera(presetId: CameraPresetId, focus?: Position) {
    this.currentPreset = presetId;
    this.currentFocus = focus;
    const destination = getThreeCameraDestination(presetId, {
      mobile: this.mobile,
      reducedMotion: this.reducedMotion,
      focus,
      pitchDegrees: this.pitch,
    });
    const local = wgs84ToLocalMeters([destination.longitude, destination.latitude]);
    const target = new THREE.Vector3(local.eastMetres * SCALE, .05, -local.northMetres * SCALE);
    const horizontal = destination.rangeMetres * Math.cos(THREE.MathUtils.degToRad(destination.pitchDegrees)) * SCALE;
    const vertical = destination.rangeMetres * Math.sin(THREE.MathUtils.degToRad(destination.pitchDegrees)) * SCALE;
    const heading = THREE.MathUtils.degToRad(destination.headingDegrees);
    const position = new THREE.Vector3(
      target.x + Math.sin(heading) * horizontal,
      target.y + vertical,
      target.z + Math.cos(heading) * horizontal,
    );

    this.controls.autoRotate = presetId === 'strategic' && !this.reducedMotion;
    this.controls.minDistance = 1.4;
    this.controls.maxDistance = 105;
    if (destination.durationMs === 0) {
      this.camera.position.copy(position);
      this.controls.target.copy(target);
      this.controls.update();
      this.tween = undefined;
      return;
    }
    this.tween = {
      startedAt: performance.now(),
      duration: destination.durationMs,
      fromPosition: this.camera.position.clone(),
      toPosition: position,
      fromTarget: this.controls.target.clone(),
      toTarget: target,
    };
  }

  setPitch(pitch: TerrainPitch) {
    this.pitch = pitch;
    this.updateCamera(this.currentPreset, this.currentFocus);
  }

  fitGeographicBounds(bounds: GeographicCameraBounds) {
    const centerLongitude = (bounds.west + bounds.east) / 2;
    const centerLatitude = (bounds.south + bounds.north) / 2;
    const west = wgs84ToLocalMeters([bounds.west, centerLatitude]);
    const east = wgs84ToLocalMeters([bounds.east, centerLatitude]);
    const south = wgs84ToLocalMeters([centerLongitude, bounds.south]);
    const north = wgs84ToLocalMeters([centerLongitude, bounds.north]);
    const spanMetres = Math.max(Math.abs(east.eastMetres - west.eastMetres), Math.abs(north.northMetres - south.northMetres));
    const rangeMetres = THREE.MathUtils.clamp(spanMetres * 2.05, 5_800, 28_000);
    const targetLocal = wgs84ToLocalMeters([centerLongitude, centerLatitude]);
    const target = new THREE.Vector3(targetLocal.eastMetres * SCALE, .05, -targetLocal.northMetres * SCALE);
    const horizontal = rangeMetres * Math.cos(THREE.MathUtils.degToRad(this.pitch)) * SCALE;
    const vertical = rangeMetres * Math.sin(THREE.MathUtils.degToRad(this.pitch)) * SCALE;
    const heading = THREE.MathUtils.degToRad(342);
    const position = new THREE.Vector3(
      target.x + Math.sin(heading) * horizontal,
      target.y + vertical,
      target.z + Math.cos(heading) * horizontal,
    );
    this.controls.autoRotate = false;
    this.tween = {
      startedAt: performance.now(),
      duration: this.reducedMotion ? 0 : 800,
      fromPosition: this.camera.position.clone(),
      toPosition: position,
      fromTarget: this.controls.target.clone(),
      toTarget: target,
    };
  }

  tick(now: number) {
    if (this.tween) {
      const t = Math.min(1, (now - this.tween.startedAt) / this.tween.duration);
      const eased = 1 - Math.pow(1 - t, 3);
      this.camera.position.lerpVectors(this.tween.fromPosition, this.tween.toPosition, eased);
      this.controls.target.lerpVectors(this.tween.fromTarget, this.tween.toTarget, eased);
      if (t >= 1) this.tween = undefined;
    }
    this.controls.enabled = !this.tween;
    this.controls.update();
    this.applyPanBounds();
  }

  private applyPanBounds() {
    const distance = this.camera.position.distanceTo(this.controls.target);
    const bounds = this.currentPreset === 'strategic' || this.currentPreset === 'kinmen' || distance > 18
      ? STRATEGIC_PAN_BOUNDS
      : LOCAL_PAN_BOUNDS;
    const west = wgs84ToLocalMeters([bounds.west, bounds.south]);
    const east = wgs84ToLocalMeters([bounds.east, bounds.north]);
    const minimumX = west.eastMetres * SCALE;
    const maximumX = east.eastMetres * SCALE;
    const minimumZ = -east.northMetres * SCALE;
    const maximumZ = -west.northMetres * SCALE;
    const clampedX = THREE.MathUtils.clamp(this.controls.target.x, minimumX, maximumX);
    const clampedZ = THREE.MathUtils.clamp(this.controls.target.z, minimumZ, maximumZ);
    const correction = new THREE.Vector3(clampedX - this.controls.target.x, 0, clampedZ - this.controls.target.z);
    if (correction.lengthSq() < .000001) return;
    correction.multiplyScalar(.16);
    this.controls.target.add(correction);
    this.camera.position.add(correction);
  }
}
