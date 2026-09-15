import * as THREE from 'three';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { REGION_CONFIG } from '../../config/region.js';
import { lonLatToWorld } from '../../shared/geo.js';

export interface RegionLabelsHandle {
  group: THREE.Group;
  update(camera: THREE.Camera, enabled: boolean): void;
  dispose(): void;
}

export function createRegionLabels(labelRenderer: CSS2DRenderer, terrainHeight: (longitude: number, latitude: number) => number): RegionLabelsHandle {
  const group = new THREE.Group();
  group.name = 'v2-region-labels';
  const labels = REGION_CONFIG.labels.map(labelConfig => {
    const element = document.createElement('span');
    element.className = `region-label region-label--${labelConfig.kind} region-label--${labelConfig.offset}`;
    element.innerHTML = `<strong>${labelConfig.text}</strong><small>${labelConfig.chinese}</small>`;
    element.dataset.label = labelConfig.id;
    const world = lonLatToWorld(labelConfig.point, terrainHeight(labelConfig.point.longitude, labelConfig.point.latitude) + (labelConfig.kind === 'major' ? 0.46 : 0.28));
    const object = new CSS2DObject(element);
    object.position.set(world.x, world.y, world.z);
    group.add(object);
    return { config: labelConfig, element, object };
  });
  labelRenderer.domElement.className = 'region-label-layer';
  return {
    group,
    update(camera, enabled) {
      group.visible = enabled;
      if (!enabled) return;
      for (const label of labels) {
        const distance = camera.position.distanceTo(label.object.getWorldPosition(new THREE.Vector3()));
        const visible = distance >= label.config.minDistance && distance <= label.config.maxDistance;
        const fade = visible
          ? Math.min(1, Math.min((distance - label.config.minDistance) / 1.8 + 0.35, (label.config.maxDistance - distance) / 5 + 0.4))
          : 0;
        label.element.style.opacity = `${Math.max(0, Math.min(1, fade))}`;
        label.element.setAttribute('aria-hidden', fade < 0.05 ? 'true' : 'false');
      }
    },
    dispose() {
      for (const label of labels) label.element.remove();
      group.clear();
    },
  };
}
