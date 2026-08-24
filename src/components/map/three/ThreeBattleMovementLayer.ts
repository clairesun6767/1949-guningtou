import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { wgs84ToLocalMeters } from '../../../battle-replay/visualization/adapters/threeAdapter.js';
import type { Position } from '../../../battle-replay/types/index.js';
import type { BattleMapFeature } from '../../../battle-replay/visualization/types.js';
import { HistoricalTerrainStyle } from './HistoricalTerrainStyle.js';
import { sampleTerrainSurfaceHeight, type TerrainAsset } from './ThreeTerrainController.js';

const SCALE = HistoricalTerrainStyle.terrain.worldUnitsPerMetre;

interface MaterialState {
  material: THREE.Material & { opacity: number };
  opacity: number;
  pulse: boolean;
}

function point(position: Position, terrain: TerrainAsset, offset = .012) {
  const projected = wgs84ToLocalMeters(position);
  return new THREE.Vector3(
    projected.eastMetres * SCALE,
    sampleTerrainSurfaceHeight(terrain, position[0], position[1], HistoricalTerrainStyle.terrain.verticalExaggeration) + offset,
    -projected.northMetres * SCALE,
  );
}

function sideColor(side: BattleMapFeature['side']) {
  if (side === 'roc') return 0x7292a0;
  if (side === 'pla') return 0xa55e42;
  return 0xb99a5f;
}

function lineStrings(feature: BattleMapFeature): Position[][] {
  if (feature.geometry?.type === 'LineString') return [feature.geometry.coordinates];
  if (feature.geometry?.type === 'MultiLineString') return feature.geometry.coordinates;
  return [];
}

function polygonRings(feature: BattleMapFeature): Position[][] {
  if (feature.geometry?.type === 'Polygon') return [feature.geometry.coordinates[0]];
  if (feature.geometry?.type === 'MultiPolygon') return feature.geometry.coordinates.map(polygon => polygon[0]);
  return [];
}

function featureLabel(feature: BattleMapFeature) {
  return typeof feature.metadata?.label === 'string' ? feature.metadata.label : feature.id;
}

function lineMidpoint(line: Position[]) {
  return line[Math.floor(line.length / 2)] ?? line[0];
}

function ringCentroid(ring: Position[]) {
  if (!ring.length) return undefined;
  const total = ring.reduce(([longitude, latitude], [nextLongitude, nextLatitude]) => [longitude + nextLongitude, latitude + nextLatitude], [0, 0] as Position);
  return [total[0] / ring.length, total[1] / ring.length] as Position;
}

function taperedRibbon(line: Position[], terrain: TerrainAsset, startWidth: number, endWidth: number, color: number, opacity: number, name: string, renderOrder = 20) {
  const projected = line.map(position => point(position, terrain));
  const positions: number[] = [];
  const indices: number[] = [];
  for (let index = 0; index < projected.length; index += 1) {
    const previous = projected[Math.max(0, index - 1)];
    const next = projected[Math.min(projected.length - 1, index + 1)];
    const tangent = new THREE.Vector2(next.x - previous.x, next.z - previous.z).normalize();
    const normal = new THREE.Vector2(-tangent.y, tangent.x);
    const t = projected.length <= 1 ? 1 : index / (projected.length - 1);
    const width = THREE.MathUtils.lerp(startWidth, endWidth, t);
    positions.push(
      projected[index].x + normal.x * width / 2, projected[index].y, projected[index].z + normal.y * width / 2,
      projected[index].x - normal.x * width / 2, projected[index].y, projected[index].z - normal.y * width / 2,
    );
    if (index < projected.length - 1) {
      const start = index * 2;
      indices.push(start, start + 2, start + 1, start + 1, start + 2, start + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, depthTest: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.renderOrder = renderOrder;
  return mesh;
}

function arrowHead(line: Position[], terrain: TerrainAsset, color: number, opacity: number, name: string) {
  if (line.length < 2) return null;
  const tip = point(line.at(-1)!, terrain, .018);
  const before = point(line.at(-2)!, terrain, .018);
  const direction = new THREE.Vector2(tip.x - before.x, tip.z - before.z).normalize();
  const normal = new THREE.Vector2(-direction.y, direction.x);
  const length = .26;
  const width = .18;
  const base = new THREE.Vector2(tip.x - direction.x * length, tip.z - direction.y * length);
  const positions = [
    tip.x, tip.y, tip.z,
    base.x + normal.x * width, tip.y, base.y + normal.y * width,
    base.x - normal.x * width, tip.y, base.y - normal.y * width,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex([0, 1, 2]);
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, depthTest: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.renderOrder = 22;
  return mesh;
}

function corridor(feature: BattleMapFeature, terrain: TerrainAsset, color: number) {
  const group = new THREE.Group();
  group.name = `${feature.id}-corridor`;
  for (const ring of polygonRings(feature)) {
    const coordinates = ring.slice(0, -1);
    if (coordinates.length < 3) continue;
    const outline = coordinates.map(position => {
      const projected = point(position, terrain, .016);
      return new THREE.Vector2(projected.x, projected.z);
    });
    const faces = THREE.ShapeUtils.triangulateShape(outline, []);
    const positions = coordinates.flatMap(position => {
      const projected = point(position, terrain, .016);
      return [projected.x, projected.y, projected.z];
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(faces.flat());
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .42, depthWrite: false, depthTest: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `${feature.id}-band`;
    mesh.renderOrder = 19;
    group.add(mesh);

    const outlineGeometry = new THREE.BufferGeometry().setFromPoints(coordinates.map(position => point(position, terrain, .022)));
    const border = new THREE.LineLoop(outlineGeometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: .58, depthWrite: false, depthTest: false }));
    border.name = `${feature.id}-soft-border`;
    border.renderOrder = 20;
    group.add(border);
  }
  return group;
}

function labelObject(feature: BattleMapFeature, position: Position, terrain: TerrainAsset) {
  const element = document.createElement('span');
  element.className = `three-battle-movement-label three-battle-movement-label--${feature.type} three-battle-movement-label--${feature.side ?? 'unknown'}`;
  element.textContent = featureLabel(feature);
  element.setAttribute('aria-label', featureLabel(feature));
  const label = new CSS2DObject(element);
  label.position.copy(point(position, terrain, .12));
  label.name = `${feature.id}-label`;
  label.userData.featureId = feature.id;
  return label;
}

export class ThreeBattleMovementLayer {
  readonly group = new THREE.Group();
  private readonly labelGroup = new THREE.Group();
  private materialStates: MaterialState[] = [];
  private labelsEnabled = true;

  constructor(private readonly terrain: TerrainAsset, _reducedMotion: boolean) {
    this.group.name = 'battle-movement-layer';
    this.group.renderOrder = 19;
    this.labelGroup.name = 'battle-movement-labels';
    this.group.add(this.labelGroup);
  }

  update(features: BattleMapFeature[], labelsEnabled = true) {
    this.labelsEnabled = labelsEnabled;
    this.disposeObjects();
    for (const feature of features.filter(item => ['direction', 'corridor', 'route'].includes(item.type))) {
      const color = sideColor(feature.side);
      if (feature.type === 'corridor') {
        const object = corridor(feature, this.terrain, color);
        object.name = feature.id;
        this.group.add(object);
        object.traverse(child => {
          if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
            this.materialStates.push({ material: child.material as THREE.Material & { opacity: number }, opacity: child instanceof THREE.Mesh ? .42 : .58, pulse: false });
          }
        });
        const centroid = polygonRings(feature).map(ringCentroid).find(Boolean);
        if (centroid && labelsEnabled) this.labelGroup.add(labelObject(feature, centroid, this.terrain));
        continue;
      }
      for (const line of lineStrings(feature)) {
        const isAxis = feature.type === 'direction';
        const halo = taperedRibbon(line, this.terrain, isAxis ? .22 : .032, isAxis ? .12 : .02, 0x241f1a, isAxis ? .34 : .16, `${feature.id}-halo`, 18);
        const object = taperedRibbon(line, this.terrain, isAxis ? .15 : .022, isAxis ? .075 : .014, color, isAxis ? .86 : .88, feature.id, 20);
        this.group.add(halo, object);
        this.materialStates.push(
          { material: halo.material as THREE.MeshBasicMaterial, opacity: isAxis ? .34 : .16, pulse: false },
          { material: object.material as THREE.MeshBasicMaterial, opacity: isAxis ? .86 : .88, pulse: isAxis },
        );
        if (feature.type === 'route' && feature.researchOnly) {
          object.visible = false;
          halo.visible = false;
          const geometry = new THREE.BufferGeometry().setFromPoints(line.map(position => point(position, this.terrain, .02)));
          const material = new THREE.LineDashedMaterial({ color, transparent: true, opacity: .76, dashSize: .055, gapSize: .032, depthWrite: false, depthTest: false });
          const route = new THREE.Line(geometry, material);
          route.computeLineDistances();
          route.name = feature.id;
          route.renderOrder = 22;
          this.group.add(route);
          this.materialStates.push({ material, opacity: .76, pulse: false });
        }
        if (isAxis) {
          const head = arrowHead(line, this.terrain, color, .96, `${feature.id}-head`);
          if (head) {
            this.group.add(head);
            this.materialStates.push({ material: head.material as THREE.MeshBasicMaterial, opacity: .96, pulse: false });
          }
        }
        const midpoint = lineMidpoint(line);
        if (midpoint && labelsEnabled) this.labelGroup.add(labelObject(feature, midpoint, this.terrain));
      }
    }
  }

  tick(_now: number, localMix: number, cameraDistance: number) {
    this.group.visible = localMix > .02 && this.group.children.length > 1;
    this.labelGroup.visible = this.labelsEnabled && this.group.visible && cameraDistance < 15;
    const breathing = 1;
    for (const state of this.materialStates) state.material.opacity = state.opacity * localMix * (state.pulse ? breathing : 1);
    this.labelGroup.traverse(object => {
      if (object instanceof CSS2DObject) object.element.style.opacity = String(Math.min(1, localMix * 1.25));
    });
  }

  private disposeObjects() {
    this.group.traverse(object => {
      if (object instanceof CSS2DObject) object.element.remove();
      if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.LineLoop) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) object.material.forEach(material => material.dispose());
        else object.material.dispose();
      }
    });
    this.group.clear();
    this.group.add(this.labelGroup);
    this.labelGroup.clear();
    this.materialStates = [];
  }

  dispose() {
    this.disposeObjects();
  }
}
