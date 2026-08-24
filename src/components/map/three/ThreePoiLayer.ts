import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { toThreePointFeatures } from '../../../battle-replay/visualization/adapters/threeAdapter.js';
import type { BattleMapFeature } from '../../../battle-replay/visualization/types.js';
import { HistoricalTerrainStyle } from './HistoricalTerrainStyle.js';
import { sampleTerrainHeight, type TerrainAsset } from './ThreeTerrainController.js';

const SCALE = HistoricalTerrainStyle.terrain.worldUnitsPerMetre;

export class ThreePoiLayer {
  readonly group = new THREE.Group();
  private clickable: THREE.Object3D[] = [];
  private selectedHalo?: THREE.Mesh;

  constructor(private readonly onSelectFeature: (id: string) => void, private readonly mobile: boolean) {
    this.group.name = 'canonical-poi-layer';
  }

  update(features: BattleMapFeature[], terrain: TerrainAsset | undefined, exaggeration: number, labelsEnabled: boolean, selectedId: string | null) {
    this.disposeChildren();
    for (const feature of toThreePointFeatures(features)) {
      const color = feature.locationType === 'military-site'
        ? HistoricalTerrainStyle.poi.militaryColor
        : feature.confidence === 'verified'
          ? HistoricalTerrainStyle.poi.verifiedColor
          : HistoricalTerrainStyle.poi.probableColor;
      const root = new THREE.Group();
      root.position.set(
        feature.eastMetres * SCALE,
        sampleTerrainHeight(terrain, feature.longitude, feature.latitude, exaggeration),
        -feature.northMetres * SCALE,
      );
      root.userData.featureId = feature.id;
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(.055, .055, .007, 24),
        new THREE.MeshStandardMaterial({ color: 0xd7cab0, roughness: .86 }),
      );
      base.position.y = .004;
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(.006, .008, .095, 12),
        new THREE.MeshStandardMaterial({ color, roughness: .7 }),
      );
      stem.position.y = .052;
      const top = new THREE.Mesh(
        new THREE.SphereGeometry(.024, 14, 10),
        new THREE.MeshStandardMaterial({ color: 0xc9a663, roughness: .58 }),
      );
      top.position.y = .112;
      for (const object of [base, stem, top]) {
        object.castShadow = true;
        object.userData.featureId = feature.id;
        this.clickable.push(object);
        root.add(object);
      }
      this.group.add(root);

      const halo = new THREE.Mesh(
        new THREE.RingGeometry(selectedId === feature.id ? .075 : .064, selectedId === feature.id ? .105 : .08, 32),
        new THREE.MeshBasicMaterial({ color: selectedId === feature.id ? 0xe2bd72 : color, transparent: true, opacity: selectedId === feature.id ? .85 : .48, side: THREE.DoubleSide, depthWrite: false }),
      );
      halo.rotation.x = -Math.PI / 2;
      halo.position.y = .009;
      root.add(halo);
      if (selectedId === feature.id) this.selectedHalo = halo;

      const mobilePriority = ['LOC-GUN-0002', 'LOC-GUN-0003', 'LOC-GUN-0005', 'LOC-GUN-0006'].includes(feature.id);
      if (labelsEnabled && (!this.mobile || mobilePriority || selectedId === feature.id)) {
        const element = document.createElement('span');
        const offsetClass = feature.id === 'LOC-GUN-0001'
          ? 'three-terrain-label--offset-west'
          : feature.id === 'LOC-GUN-0002'
            ? 'three-terrain-label--offset-east'
            : feature.id === 'LOC-GUN-0005'
              ? 'three-terrain-label--offset-nanshan'
              : feature.id === 'LOC-GUN-0006'
                ? 'three-terrain-label--offset-beishan'
            : '';
        element.className = `three-terrain-label three-terrain-label--poi ${offsetClass} ${selectedId === feature.id ? 'is-selected' : ''}`;
        element.textContent = feature.label ?? feature.id;
        element.dataset.featureId = feature.id;
        element.addEventListener('click', () => this.onSelectFeature(feature.id));
        const label = new CSS2DObject(element);
        label.position.set(0, feature.id === 'LOC-GUN-0001' ? .23 : .18, 0);
        root.add(label);
      }
    }
  }

  tick(now: number) {
    if (!this.selectedHalo) return;
    const scale = 1 + Math.sin(now * .003) * .08;
    this.selectedHalo.scale.setScalar(scale);
  }

  pick(raycaster: THREE.Raycaster) {
    const hit = raycaster.intersectObjects(this.clickable, false)[0];
    const id = hit?.object.userData.featureId;
    if (typeof id === 'string') this.onSelectFeature(id);
  }

  private disposeChildren() {
    this.group.traverse(object => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) object.material.forEach(material => material.dispose());
        else object.material.dispose();
      }
      if (object instanceof CSS2DObject) object.element.remove();
    });
    this.group.clear();
    this.clickable = [];
    this.selectedHalo = undefined;
  }

  dispose() {
    this.disposeChildren();
  }
}
