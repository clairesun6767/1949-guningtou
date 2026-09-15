import * as THREE from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  REGION_CONFIG,
  type GeographicBounds,
  type GeographicPoint,
  type RegionPerformanceTier,
  type RegionPresetId,
} from '../../config/region.js';
import { clamp, geographicBoundsToWorld, lonLatToWorld } from '../../shared/geo.js';
import { configureRegionControls } from './RegionControls.js';

export interface RegionCameraConstraintSnapshot {
  distance: number;
  polarDegrees: number;
  target: { x: number; y: number; z: number };
}

export interface RegionCameraOptions {
  mobile: boolean;
  reducedMotion: boolean;
  tier: RegionPerformanceTier;
}

export function clampRegionDistance(distance: number, mobile = false) {
  const minimum = mobile ? REGION_CONFIG.camera.mobileMinDistance : REGION_CONFIG.camera.minDistance;
  const maximum = mobile ? REGION_CONFIG.camera.mobileMaxDistance : REGION_CONFIG.camera.maxDistance;
  return clamp(distance, minimum, maximum);
}

export function clampRegionPolarDegrees(polarDegrees: number) {
  return clamp(polarDegrees, REGION_CONFIG.camera.minPolarDegrees, REGION_CONFIG.camera.maxPolarDegrees);
}

export function clampRegionTarget(point: GeographicPoint, bounds: GeographicBounds = REGION_CONFIG.camera.targetBounds): GeographicPoint {
  return {
    longitude: clamp(point.longitude, bounds.west, bounds.east),
    latitude: clamp(point.latitude, bounds.south, bounds.north),
  };
}

export function getRegionPreset(id: RegionPresetId, mobile = false) {
  const preset = REGION_CONFIG.presets[id];
  return {
    ...preset,
    target: clampRegionTarget(preset.target),
    distance: clampRegionDistance(preset.distance, mobile),
    polarDegrees: clampRegionPolarDegrees(preset.polarDegrees),
  };
}

export function targetWithinRegionBounds(point: GeographicPoint, bounds: GeographicBounds = REGION_CONFIG.camera.targetBounds) {
  return point.longitude >= bounds.west && point.longitude <= bounds.east && point.latitude >= bounds.south && point.latitude <= bounds.north;
}

interface CameraTween {
  startedAt: number;
  duration: number;
  fromPosition: THREE.Vector3;
  toPosition: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
}

export class RegionCamera {
  private tween?: CameraTween;
  private currentPreset: RegionPresetId = 'hero';
  private readonly targetWorldBounds = geographicBoundsToWorld(REGION_CONFIG.camera.targetBounds);

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly controls: OrbitControls,
    private readonly options: RegionCameraOptions,
  ) {
    configureRegionControls(controls, options.mobile);
    controls.minDistance = options.mobile ? REGION_CONFIG.camera.mobileMinDistance : REGION_CONFIG.camera.minDistance;
    controls.maxDistance = options.mobile ? REGION_CONFIG.camera.mobileMaxDistance : REGION_CONFIG.camera.maxDistance;
    controls.minPolarAngle = THREE.MathUtils.degToRad(REGION_CONFIG.camera.minPolarDegrees);
    controls.maxPolarAngle = THREE.MathUtils.degToRad(REGION_CONFIG.camera.maxPolarDegrees);
  }

  flyTo(id: RegionPresetId) {
    const preset = getRegionPreset(id, this.options.mobile);
    this.currentPreset = id;
    const target = lonLatToWorld(preset.target, 0.08);
    const polar = THREE.MathUtils.degToRad(preset.polarDegrees);
    const azimuth = THREE.MathUtils.degToRad(preset.azimuthDegrees);
    const horizontal = preset.distance * Math.sin(polar);
    const vertical = preset.distance * Math.cos(polar);
    const position = new THREE.Vector3(
      target.x + Math.sin(azimuth) * horizontal,
      target.y + vertical,
      target.z + Math.cos(azimuth) * horizontal,
    );
    this.controls.autoRotate = id === 'hero' && !this.options.reducedMotion;
    const tween: CameraTween = {
      startedAt: performance.now(),
      duration: this.options.reducedMotion ? 0 : 900,
      fromPosition: this.camera.position.clone(),
      toPosition: position,
      fromTarget: this.controls.target.clone(),
      toTarget: new THREE.Vector3(target.x, target.y, target.z),
    };
    this.tween = tween;
    if (tween.duration === 0) this.finishTween();
  }

  reset() {
    this.flyTo('hero');
  }

  setReviewAzimuth(degrees: number) {
    this.tween = undefined;
    this.controls.autoRotate = false;
    this.controls.enabled = true;
    const target = this.controls.target.clone();
    const offset = this.camera.position.clone().sub(target);
    const distance = clampRegionDistance(offset.length(), this.options.mobile);
    const polar = clampRegionPolarDegrees(THREE.MathUtils.radToDeg(offset.angleTo(new THREE.Vector3(0, 1, 0))));
    const currentAzimuth = Math.atan2(offset.x, offset.z);
    const azimuth = currentAzimuth + THREE.MathUtils.degToRad(degrees);
    const horizontal = distance * Math.sin(THREE.MathUtils.degToRad(polar));
    const vertical = distance * Math.cos(THREE.MathUtils.degToRad(polar));
    this.camera.position.set(
      target.x + Math.sin(azimuth) * horizontal,
      target.y + vertical,
      target.z + Math.cos(azimuth) * horizontal,
    );
    this.controls.update();
    this.applyTargetBounds();
  }

  setReviewPolar(degrees: number) {
    this.tween = undefined;
    this.controls.autoRotate = false;
    this.controls.enabled = true;
    const target = this.controls.target.clone();
    const offset = this.camera.position.clone().sub(target);
    const distance = clampRegionDistance(offset.length(), this.options.mobile);
    const polar = THREE.MathUtils.degToRad(clampRegionPolarDegrees(degrees));
    const azimuth = Math.atan2(offset.x, offset.z);
    const horizontal = distance * Math.sin(polar);
    const vertical = distance * Math.cos(polar);
    this.camera.position.set(
      target.x + Math.sin(azimuth) * horizontal,
      target.y + vertical,
      target.z + Math.cos(azimuth) * horizontal,
    );
    this.controls.update();
    this.applyTargetBounds();
  }

  update(now: number) {
    if (this.tween) {
      const duration = Math.max(1, this.tween.duration);
      const progress = Math.min(1, (now - this.tween.startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      this.camera.position.lerpVectors(this.tween.fromPosition, this.tween.toPosition, eased);
      this.controls.target.lerpVectors(this.tween.fromTarget, this.tween.toTarget, eased);
      if (progress >= 1) this.finishTween();
    }
    this.controls.enabled = !this.tween;
    this.controls.update();
    this.applyTargetBounds();
    (this.camera.userData ??= {}).regionTarget = this.controls.target.clone();
  }

  snapshot(): RegionCameraConstraintSnapshot {
    const target = this.controls.target;
    return {
      distance: this.camera.position.distanceTo(target),
      polarDegrees: THREE.MathUtils.radToDeg(this.camera.position.clone().sub(target).angleTo(new THREE.Vector3(0, 1, 0))),
      target: { x: target.x, y: target.y, z: target.z },
    };
  }

  getPreset() {
    return this.currentPreset;
  }

  private finishTween() {
    if (!this.tween) return;
    this.camera.position.copy(this.tween.toPosition);
    this.controls.target.copy(this.tween.toTarget);
    this.tween = undefined;
  }

  private applyTargetBounds() {
    const target = this.controls.target;
    const clampedX = clamp(target.x, this.targetWorldBounds.minX, this.targetWorldBounds.maxX);
    const clampedZ = clamp(target.z, this.targetWorldBounds.minZ, this.targetWorldBounds.maxZ);
    const correction = new THREE.Vector3(clampedX - target.x, 0, clampedZ - target.z);
    if (correction.lengthSq() < 0.000001) return;
    correction.multiplyScalar(0.22);
    target.add(correction);
    this.camera.position.add(correction);
  }
}
