import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { wgs84ToLocalMeters } from '../../../battle-replay/visualization/adapters/threeAdapter.js';
import type { Position } from '../../../battle-replay/types/index.js';
import { historicalTraceLabel, type HistoricalTraceFeature } from '../../../battle-replay/visualization/historicalTraces.js';
import { HistoricalTerrainStyle } from './HistoricalTerrainStyle.js';
import { sampleTerrainSurfaceHeight, type TerrainAsset } from './ThreeTerrainController.js';

const SCALE = HistoricalTerrainStyle.terrain.worldUnitsPerMetre;

interface TraceEntry {
  feature: HistoricalTraceFeature;
  objects: THREE.Object3D[];
  lines: Array<{ line: THREE.Line; points: THREE.Vector3[] }>;
  arrowHeads: Array<{ mesh: THREE.Mesh; line: Position[] }>;
  materials: Array<{ material: THREE.Material & { opacity: number }; baseOpacity: number }>;
}

function point(position: Position, terrain: TerrainAsset, offset = .035) {
  const projected = wgs84ToLocalMeters(position);
  return new THREE.Vector3(
    projected.eastMetres * SCALE,
    sampleTerrainSurfaceHeight(terrain, position[0], position[1], HistoricalTerrainStyle.terrain.verticalExaggeration) + offset,
    -projected.northMetres * SCALE,
  );
}

function lineStrings(feature: HistoricalTraceFeature): Position[][] {
  if (feature.geometry.type === 'LineString') return [feature.geometry.coordinates];
  if (feature.geometry.type === 'MultiLineString') return feature.geometry.coordinates;
  return [];
}

function polygonRings(feature: HistoricalTraceFeature): Position[][] {
  if (feature.geometry.type === 'Polygon') return [feature.geometry.coordinates[0]];
  if (feature.geometry.type === 'MultiPolygon') return feature.geometry.coordinates.map(polygon => polygon[0]);
  return [];
}

function sideColor(feature: HistoricalTraceFeature) {
  if (feature.properties.side === 'pla') return 0xa55e42;
  if (feature.properties.side === 'roc') return 0x6f92a2;
  return 0xb79861;
}

function pointAtProgress(line: Position[], progress: number): { position: Position; before: Position; after: Position } {
  const normalized = Math.max(0, Math.min(1, progress));
  if (line.length < 2) return { position: line[0] ?? [118.329, 24.47], before: line[0] ?? [118.329, 24.47], after: line[0] ?? [118.329, 24.47] };
  const lengths = [0];
  for (let index = 1; index < line.length; index += 1) {
    const [aLongitude, aLatitude] = line[index - 1];
    const [bLongitude, bLatitude] = line[index];
    lengths.push(lengths[index - 1] + Math.hypot(bLongitude - aLongitude, bLatitude - aLatitude));
  }
  const target = lengths.at(-1)! * normalized;
  const segment = Math.max(0, lengths.findIndex(value => value >= target) - 1);
  const startLength = lengths[segment];
  const endLength = lengths[segment + 1] ?? startLength;
  const t = endLength === startLength ? 0 : (target - startLength) / (endLength - startLength);
  const before = line[segment];
  const after = line[Math.min(line.length - 1, segment + 1)];
  return {
    position: [before[0] + (after[0] - before[0]) * t, before[1] + (after[1] - before[1]) * t],
    before,
    after,
  };
}

function createArrowHead(line: Position[], terrain: TerrainAsset, color: number) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Array(9).fill(0), 3));
  geometry.setIndex([0, 1, 2]);
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .94, depthWrite: false, depthTest: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 36;
  updateArrowHead(mesh, line, terrain, 0);
  return mesh;
}

function updateArrowHead(mesh: THREE.Mesh, line: Position[], terrain: TerrainAsset, progress: number) {
  if (line.length < 2) {
    mesh.visible = false;
    return;
  }
  mesh.visible = progress > .02;
  const target = pointAtProgress(line, progress);
  const tip = point(target.position, terrain, .065);
  const before = point(target.before, terrain, .065);
  const after = point(target.after, terrain, .065);
  const direction = new THREE.Vector2(after.x - before.x, after.z - before.z).normalize();
  const normal = new THREE.Vector2(-direction.y, direction.x);
  const length = .23;
  const width = .14;
  const base = new THREE.Vector2(tip.x - direction.x * length, tip.z - direction.y * length);
  const attribute = mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
  attribute.setXYZ(0, tip.x, tip.y, tip.z);
  attribute.setXYZ(1, base.x + normal.x * width, tip.y, base.y + normal.y * width);
  attribute.setXYZ(2, base.x - normal.x * width, tip.y, base.y - normal.y * width);
  attribute.needsUpdate = true;
  mesh.geometry.computeBoundingSphere();
}

function buildPolygon(feature: HistoricalTraceFeature, terrain: TerrainAsset, color: number) {
  const group = new THREE.Group();
  for (const ring of polygonRings(feature)) {
    const coordinates = ring.slice(0, -1);
    if (coordinates.length < 3) continue;
    const projected = coordinates.map(position => point(position, terrain, .045));
    const outline = projected.map(item => new THREE.Vector2(item.x, item.z));
    const faces = THREE.ShapeUtils.triangulateShape(outline, []);
    const positions = projected.flatMap(item => [item.x, item.y, item.z]);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(faces.flat());
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .2, depthWrite: false, depthTest: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = feature.id + '-area';
    mesh.renderOrder = 31;
    group.add(mesh);
    const border = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(projected.map(item => new THREE.Vector3(item.x, item.y + .012, item.z))),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: .72, depthWrite: false, depthTest: false }),
    );
    border.name = feature.id + '-border';
    border.renderOrder = 32;
    group.add(border);
  }
  return group;
}

function labelObject(feature: HistoricalTraceFeature, terrain: TerrainAsset, position: Position, onSelect: (id: string) => void) {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = 'three-historical-trace-label three-historical-trace-label--' + (feature.properties.side ?? 'unknown');
  element.textContent = historicalTraceLabel(feature);
  element.setAttribute('aria-label', historicalTraceLabel(feature));
  element.dataset.traceFeatureId = feature.id;
  element.addEventListener('click', event => {
    event.stopPropagation();
    onSelect(feature.id);
  });
  const label = new CSS2DObject(element);
  label.position.copy(point(position, terrain, .16));
  label.name = feature.id + '-label';
  label.userData.featureId = feature.id;
  return label;
}

function midpoint(feature: HistoricalTraceFeature) {
  const line = lineStrings(feature)[0];
  if (line?.length) return line[Math.floor(line.length / 2)];
  const ring = polygonRings(feature)[0];
  if (ring?.length) {
    const total = ring.reduce(([longitude, latitude], [nextLongitude, nextLatitude]) => [longitude + nextLongitude, latitude + nextLatitude], [0, 0] as Position);
    return [total[0] / ring.length, total[1] / ring.length] as Position;
  }
  return undefined;
}

export class ThreeHistoricalTraceLayer {
  readonly group = new THREE.Group();
  private readonly labelGroup = new THREE.Group();
  private readonly entries = new Map<string, TraceEntry>();
  private labelsEnabled = true;
  private progressById = new Map<string, number>();

  constructor(
    private readonly terrain: TerrainAsset,
    reducedMotion: boolean,
    private readonly onSelect: (id: string) => void,
  ) {
    void reducedMotion;
    this.group.name = 'historical-map-source-traces';
    this.group.renderOrder = 30;
    this.labelGroup.name = 'historical-map-source-trace-labels';
    this.group.add(this.labelGroup);
  }

  update(features: HistoricalTraceFeature[], labelsEnabled: boolean) {
    this.labelsEnabled = labelsEnabled;
    this.disposeObjects();
    for (const feature of features) {
      const color = sideColor(feature);
      const entry: TraceEntry = { feature, objects: [], lines: [], arrowHeads: [], materials: [] };
      const isArrow = feature.properties.featureType === 'historical_attack_arrow';
      if (feature.properties.featureType === 'battle_area' || feature.properties.featureType === 'historical_movement_corridor') {
        const area = buildPolygon(feature, this.terrain, color);
        this.group.add(area);
        entry.objects.push(area);
        area.traverse(child => {
          if (child instanceof THREE.Mesh || child instanceof THREE.LineLoop) {
            entry.materials.push({ material: child.material as THREE.Material & { opacity: number }, baseOpacity: child instanceof THREE.Mesh ? .2 : .72 });
          }
        });
      }
      for (const line of lineStrings(feature)) {
        if (line.length < 2) continue;
        const points = line.map(position => point(position, this.terrain));
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        geometry.setDrawRange(0, 0);
        const lineObject = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: isArrow ? .96 : .78, depthWrite: false, depthTest: false }));
        lineObject.name = feature.id;
        lineObject.userData.featureId = feature.id;
        lineObject.renderOrder = isArrow ? 34 : 33;
        this.group.add(lineObject);
        entry.objects.push(lineObject);
        entry.lines.push({ line: lineObject, points });
        entry.materials.push({ material: lineObject.material as THREE.LineBasicMaterial, baseOpacity: isArrow ? .96 : .78 });
        if (isArrow) {
          const head = createArrowHead(line, this.terrain, color);
          head.userData.featureId = feature.id;
          this.group.add(head);
          entry.objects.push(head);
          entry.arrowHeads.push({ mesh: head, line });
          entry.materials.push({ material: head.material as THREE.MeshBasicMaterial, baseOpacity: .94 });
        }
      }
      const labelPosition = midpoint(feature);
      if (labelPosition && labelsEnabled) this.labelGroup.add(labelObject(feature, this.terrain, labelPosition, this.onSelect));
      this.entries.set(feature.id, entry);
      this.progressById.set(feature.id, 1);
    }
  }

  updateProgress(progressById: Map<string, number>) {
    this.progressById = new Map(progressById);
  }

  tick(localMix: number, cameraDistance: number) {
    this.group.visible = localMix > .02 && this.entries.size > 0;
    this.labelGroup.visible = this.labelsEnabled && this.group.visible && cameraDistance < 20;
    for (const entry of this.entries.values()) {
      const progress = this.progressById.get(entry.feature.id) ?? 0;
      const isStepFeature = ['battle_front', 'defensive_line', 'battle_area', 'historical_movement_corridor'].includes(entry.feature.properties.featureType);
      for (const lineEntry of entry.lines) {
        const count = progress <= .01 ? 0 : isStepFeature ? lineEntry.points.length : Math.max(2, Math.ceil(progress * lineEntry.points.length));
        lineEntry.line.geometry.setDrawRange(0, count);
      }
      for (const arrowHead of entry.arrowHeads) updateArrowHead(arrowHead.mesh, arrowHead.line, this.terrain, progress);
      for (const state of entry.materials) {
        state.material.opacity = state.baseOpacity * localMix * (isStepFeature && progress > .01 ? 1 : progress);
      }
    }
    this.labelGroup.traverse(object => {
      if (object instanceof CSS2DObject) object.element.style.opacity = String(Math.min(1, localMix * 1.25));
    });
  }

  private disposeObjects() {
    for (const entry of this.entries.values()) {
      for (const object of entry.objects) {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.LineLoop) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) object.material.forEach(material => material.dispose());
          else object.material.dispose();
        }
      }
    }
    this.entries.clear();
    this.group.clear();
    this.labelGroup.clear();
    this.group.add(this.labelGroup);
  }

  dispose() {
    this.disposeObjects();
  }
}
