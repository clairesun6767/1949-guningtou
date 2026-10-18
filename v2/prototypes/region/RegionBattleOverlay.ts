import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import type { Position } from '../../../src/battle-replay/types/index.js';
import type { BattleMapFeature } from '../../../src/battle-replay/visualization/types.js';
import {
  historicalTraceVisitorLabel,
  type HistoricalTraceFeature,
  type HistoricalTraceVisualProgress,
} from '../../../src/battle-replay/visualization/historicalTraces.js';
import { lonLatToWorld } from '../../shared/geo.js';
import { sampleRegionTerrainHeight } from './RegionTerrain.js';
import type { RegionTerrainAsset } from '../../shared/regionDataProvider.js';

interface TraceLineState {
  geometry: LineGeometry;
  material: LineMaterial;
  segments: number;
}

interface TraceEntry {
  feature: HistoricalTraceFeature;
  objects: THREE.Object3D[];
  lines: TraceLineState[];
  arrowHeads: Array<{ mesh: THREE.Mesh; line: Position[] }>;
  materials: Array<{ material: THREE.Material & { opacity: number }; opacity: number }>;
}

interface RegionBattleOverlayOptions {
  terrain: RegionTerrainAsset;
  features?: BattleMapFeature[];
  historicalTraces?: HistoricalTraceFeature[];
  historicalTraceProgress?: Map<string, HistoricalTraceVisualProgress>;
  labelsVisible?: boolean;
  locale?: string;
  onSelectFeature?: (id: string) => void;
  onSelectHistoricalTrace?: (id: string) => void;
}

function point(position: Position, terrain: RegionTerrainAsset, offset = 0.045) {
  const world = lonLatToWorld({ longitude: position[0], latitude: position[1] }, sampleRegionTerrainHeight(terrain, position[0], position[1]) + offset);
  return new THREE.Vector3(world.x, world.y, world.z);
}

function lineStrings(feature: { geometry: { type: string; coordinates: unknown } | null }): Position[][] {
  if (feature.geometry?.type === 'LineString') return [feature.geometry.coordinates as Position[]];
  if (feature.geometry?.type === 'MultiLineString') return feature.geometry.coordinates as Position[][];
  return [];
}

function polygonRings(feature: { geometry: { type: string; coordinates: unknown } | null }): Position[][] {
  if (feature.geometry?.type === 'Polygon') return [(feature.geometry.coordinates as Position[][])[0] ?? []];
  if (feature.geometry?.type === 'MultiPolygon') return (feature.geometry.coordinates as Position[][][]).map(polygon => polygon[0] ?? []);
  return [];
}

function sideColor(side: string | undefined) {
  if (side === 'roc') return 0x6f94a5;
  if (side === 'pla') return 0xb45d4a;
  return 0xc6a96c;
}

function featureLabel(feature: BattleMapFeature) {
  return typeof feature.metadata?.label === 'string' ? feature.metadata.label : feature.id;
}

function midpoint(feature: HistoricalTraceFeature): Position | undefined {
  const line = lineStrings(feature)[0];
  if (line?.length) return line[Math.floor(line.length / 2)];
  const ring = polygonRings(feature)[0];
  if (!ring?.length) return undefined;
  const total = ring.reduce(([longitude, latitude], [nextLongitude, nextLatitude]) => [longitude + nextLongitude, latitude + nextLatitude], [0, 0]);
  return [total[0] / ring.length, total[1] / ring.length];
}

function ringCentroid(ring: Position[]) {
  if (!ring.length) return undefined;
  const total = ring.reduce(([longitude, latitude], [nextLongitude, nextLatitude]) => [longitude + nextLongitude, latitude + nextLatitude], [0, 0]);
  return [total[0] / ring.length, total[1] / ring.length] as Position;
}

function createRibbon(line: Position[], terrain: RegionTerrainAsset, color: number, width: number, opacity: number, name: string) {
  if (line.length < 2) return null;
  const projected = line.map(item => point(item, terrain, 0.075));
  const positions: number[] = [];
  for (let index = 0; index < projected.length; index += 1) {
    const previous = projected[Math.max(0, index - 1)];
    const next = projected[Math.min(projected.length - 1, index + 1)];
    const tangent = new THREE.Vector2(next.x - previous.x, next.z - previous.z).normalize();
    const normal = new THREE.Vector2(-tangent.y, tangent.x);
    positions.push(
      projected[index].x + normal.x * width / 2, projected[index].y, projected[index].z + normal.y * width / 2,
      projected[index].x - normal.x * width / 2, projected[index].y, projected[index].z - normal.y * width / 2,
    );
  }
  const indices: number[] = [];
  for (let index = 0; index < projected.length - 1; index += 1) {
    const start = index * 2;
    indices.push(start, start + 2, start + 1, start + 1, start + 2, start + 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, depthTest: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.renderOrder = 26;
  return mesh;
}

function createArrowHead(line: Position[], terrain: RegionTerrainAsset, color: number, name: string) {
  if (line.length < 2) return null;
  const tip = point(line.at(-1)!, terrain, 0.1);
  const before = point(line.at(-2)!, terrain, 0.1);
  const direction = new THREE.Vector2(tip.x - before.x, tip.z - before.z).normalize();
  const normal = new THREE.Vector2(-direction.y, direction.x);
  const length = 0.32;
  const width = 0.2;
  const base = new THREE.Vector2(tip.x - direction.x * length, tip.z - direction.y * length);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    tip.x, tip.y, tip.z,
    base.x + normal.x * width, tip.y, base.y + normal.y * width,
    base.x - normal.x * width, tip.y, base.y - normal.y * width,
  ], 3));
  geometry.setIndex([0, 1, 2]);
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, depthWrite: false, depthTest: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.renderOrder = 29;
  return mesh;
}

function createPolygon(feature: BattleMapFeature, terrain: RegionTerrainAsset, color: number) {
  const group = new THREE.Group();
  for (const ring of polygonRings(feature)) {
    const coordinates = ring.slice(0, -1);
    if (coordinates.length < 3) continue;
    const projected = coordinates.map(item => point(item, terrain, 0.065));
    const outline = projected.map(item => new THREE.Vector2(item.x, item.z));
    const faces = THREE.ShapeUtils.triangulateShape(outline, []);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(projected.flatMap(item => [item.x, item.y, item.z]), 3));
    geometry.setIndex(faces.flat());
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.24, depthWrite: false, depthTest: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = 24;
    group.add(mesh);
    const border = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(projected.map(item => new THREE.Vector3(item.x, item.y + 0.015, item.z))),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.72, depthWrite: false, depthTest: false }),
    );
    border.renderOrder = 27;
    group.add(border);
  }
  return group;
}

function createLabel(text: string, className: string, position: Position, terrain: RegionTerrainAsset, onClick?: () => void) {
  const element = document.createElement(onClick ? 'button' : 'span');
  if (onClick) (element as HTMLButtonElement).type = 'button';
  element.className = className;
  element.textContent = text;
  element.setAttribute('aria-label', text);
  if (onClick) element.addEventListener('click', event => { event.stopPropagation(); onClick(); });
  const label = new CSS2DObject(element);
  label.position.copy(point(position, terrain, 0.22));
  label.userData.labelElement = element;
  return label;
}

function disposeGroup(group: THREE.Group) {
  group.traverse(object => {
    if (object instanceof CSS2DObject) object.element.remove();
    if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.LineLoop || object instanceof Line2) {
      object.geometry.dispose();
      if (Array.isArray(object.material)) object.material.forEach(material => material.dispose());
      else object.material.dispose();
    }
  });
  group.clear();
}

export class RegionBattleOverlay {
  readonly group = new THREE.Group();
  private readonly movementGroup = new THREE.Group();
  private readonly traceGroup = new THREE.Group();
  private readonly movementLabelGroup = new THREE.Group();
  private readonly traceLabelGroup = new THREE.Group();
  private readonly traceEntries = new Map<string, TraceEntry>();
  private progressById = new Map<string, HistoricalTraceVisualProgress>();
  private labelsVisible: boolean;
  private readonly locale: string;
  private readonly terrain: RegionTerrainAsset;
  private readonly onSelectFeature?: (id: string) => void;
  private readonly onSelectHistoricalTrace?: (id: string) => void;

  constructor(options: RegionBattleOverlayOptions) {
    this.terrain = options.terrain;
    this.labelsVisible = options.labelsVisible ?? true;
    this.locale = options.locale ?? 'zh-Hant';
    this.onSelectFeature = options.onSelectFeature;
    this.onSelectHistoricalTrace = options.onSelectHistoricalTrace;
    this.group.name = 'v2-region-battle-overlay';
    this.movementGroup.name = 'v2-region-battle-movement';
    this.traceGroup.name = 'v2-region-historical-traces';
    this.movementLabelGroup.name = 'v2-region-battle-labels';
    this.traceLabelGroup.name = 'v2-region-trace-labels';
    this.group.add(this.movementGroup, this.traceGroup, this.movementLabelGroup, this.traceLabelGroup);
    this.updateFeatures(options.features ?? [], this.labelsVisible);
    this.updateHistoricalTraces(options.historicalTraces ?? [], this.labelsVisible);
    this.updateHistoricalTraceProgress(options.historicalTraceProgress ?? new Map());
  }

  updateFeatures(features: BattleMapFeature[], labelsVisible = this.labelsVisible, selectedId: string | null = null) {
    this.labelsVisible = labelsVisible;
    disposeGroup(this.movementGroup);
    disposeGroup(this.movementLabelGroup);
    for (const feature of features) {
      if (feature.type === 'location' && feature.geometry?.type === 'Point') {
        const position = feature.geometry.coordinates;
        const marker = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), new THREE.MeshBasicMaterial({ color: feature.id === selectedId ? 0xf4d28c : 0xd6b46f }));
        marker.position.copy(point(position, this.terrain, 0.09));
        marker.renderOrder = 28;
        this.movementGroup.add(marker);
        if (this.labelsVisible && this.onSelectFeature) {
          const label = createLabel(featureLabel(feature), `three-terrain-label three-terrain-label--poi ${feature.id === selectedId ? 'is-selected' : ''}`, position, this.terrain, () => this.onSelectFeature?.(feature.id));
          this.movementLabelGroup.add(label);
        }
        continue;
      }
      if (!['direction', 'corridor', 'route'].includes(feature.type)) continue;
      const color = sideColor(feature.side);
      if (feature.type === 'corridor') {
        this.movementGroup.add(createPolygon(feature, this.terrain, color));
        const center = polygonRings(feature).map(ringCentroid).find(Boolean);
        if (center && this.labelsVisible) this.movementLabelGroup.add(createLabel(featureLabel(feature), `three-battle-movement-label three-battle-movement-label--corridor three-battle-movement-label--${feature.side ?? 'unknown'}`, center, this.terrain));
        continue;
      }
      for (const line of lineStrings(feature)) {
        const axis = feature.type === 'direction';
        const halo = createRibbon(line, this.terrain, 0x171714, axis ? 0.27 : 0.065, axis ? 0.42 : 0.2, `${feature.id}-halo`);
        const ribbon = createRibbon(line, this.terrain, color, axis ? 0.18 : 0.038, 0.92, feature.id);
        if (halo) this.movementGroup.add(halo);
        if (ribbon) this.movementGroup.add(ribbon);
        if (axis) {
          const head = createArrowHead(line, this.terrain, color, `${feature.id}-head`);
          if (head) this.movementGroup.add(head);
        }
        const center = line[Math.floor(line.length / 2)] ?? line[0];
        if (center && this.labelsVisible) this.movementLabelGroup.add(createLabel(featureLabel(feature), `three-battle-movement-label three-battle-movement-label--${feature.type} three-battle-movement-label--${feature.side ?? 'unknown'}`, center, this.terrain));
      }
    }
  }

  updateHistoricalTraces(features: HistoricalTraceFeature[], labelsVisible = this.labelsVisible) {
    this.labelsVisible = labelsVisible;
    disposeGroup(this.traceGroup);
    disposeGroup(this.traceLabelGroup);
    this.traceEntries.clear();
    for (const feature of features) {
      const color = sideColor(feature.properties.side);
      const entry: TraceEntry = { feature, objects: [], lines: [], arrowHeads: [], materials: [] };
      const isArea = feature.properties.featureType === 'battle_area' || feature.properties.featureType === 'historical_movement_corridor';
      if (isArea) {
        const group = new THREE.Group();
        for (const ring of polygonRings(feature)) {
          const coordinates = ring.slice(0, -1);
          if (coordinates.length < 3) continue;
          const projected = coordinates.map(item => point(item, this.terrain, 0.085));
          const outline = projected.map(item => new THREE.Vector2(item.x, item.z));
          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute('position', new THREE.Float32BufferAttribute(projected.flatMap(item => [item.x, item.y, item.z]), 3));
          geometry.setIndex(THREE.ShapeUtils.triangulateShape(outline, []).flat());
          const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.2, depthWrite: false, depthTest: false, side: THREE.DoubleSide });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.renderOrder = 30;
          group.add(mesh);
          entry.objects.push(mesh);
          entry.materials.push({ material, opacity: 0.2 });
          const borderMaterial = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.75, depthWrite: false, depthTest: false });
          const border = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(projected), borderMaterial);
          border.renderOrder = 31;
          group.add(border);
          entry.objects.push(border);
          entry.materials.push({ material: borderMaterial, opacity: 0.75 });
        }
        this.traceGroup.add(group);
        entry.objects.push(group);
      }
      for (const line of lineStrings(feature)) {
        if (line.length < 2) continue;
        const geometry = new LineGeometry().setFromPoints(line.map(item => point(item, this.terrain, 0.105)));
        const material = new LineMaterial({ color, linewidth: feature.properties.featureType === 'historical_attack_arrow' ? 4.2 : 3.5, transparent: true, opacity: 0.94, depthWrite: false, depthTest: false });
        material.resolution.set(1, 1);
        const object = new Line2(geometry, material);
        object.name = feature.id;
        object.renderOrder = 33;
        this.traceGroup.add(object);
        entry.objects.push(object);
        entry.lines.push({ geometry, material, segments: Math.max(0, line.length - 1) });
        entry.materials.push({ material, opacity: 0.94 });
        if (feature.properties.featureType === 'historical_attack_arrow') {
          const head = createArrowHead(line, this.terrain, color, `${feature.id}-head`);
          if (head) {
            this.traceGroup.add(head);
            entry.objects.push(head);
            entry.arrowHeads.push({ mesh: head, line });
            entry.materials.push({ material: head.material as THREE.MeshBasicMaterial, opacity: 0.96 });
          }
        }
      }
      const labelPosition = midpoint(feature);
      if (labelPosition && this.labelsVisible) {
        const label = historicalTraceVisitorLabel(feature, this.locale);
        const side = feature.properties.side ?? 'unknown';
        this.traceLabelGroup.add(createLabel(label, `three-historical-trace-label three-historical-trace-label--${side}`, labelPosition, this.terrain, () => this.onSelectHistoricalTrace?.(feature.id)));
      }
      this.traceEntries.set(feature.id, entry);
    }
    this.updateHistoricalTraceProgress(this.progressById);
  }

  updateHistoricalTraceProgress(progressById: Map<string, HistoricalTraceVisualProgress>) {
    this.progressById = new Map(progressById);
    for (const entry of this.traceEntries.values()) {
      const progress = this.progressById.get(entry.feature.id) ?? { reveal: 1, opacity: 1 };
      const reveal = THREE.MathUtils.clamp(progress.reveal, 0, 1);
      const opacity = THREE.MathUtils.clamp(progress.opacity, 0, 1);
      for (const line of entry.lines) line.geometry.instanceCount = reveal <= 0.01 ? 0 : Math.max(1, Math.ceil(line.segments * reveal));
      for (const state of entry.materials) state.material.opacity = state.opacity * opacity;
      for (const arrow of entry.arrowHeads) arrow.mesh.visible = reveal > 0.02;
      for (const object of entry.objects) if (object !== entry.objects[0]) object.visible = opacity > 0.01;
    }
  }

  setLabelsVisible(visible: boolean) {
    this.labelsVisible = visible;
    this.movementLabelGroup.visible = visible;
    this.traceLabelGroup.visible = visible;
  }

  resize(width: number, height: number) {
    this.group.traverse(object => {
      if (object instanceof Line2) (object.material as LineMaterial).resolution.set(width, height);
    });
  }

  dispose() {
    disposeGroup(this.movementGroup);
    disposeGroup(this.traceGroup);
    disposeGroup(this.movementLabelGroup);
    disposeGroup(this.traceLabelGroup);
    this.traceEntries.clear();
    this.group.clear();
  }
}
