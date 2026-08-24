import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { wgs84ToLocalMeters } from '../../../battle-replay/visualization/adapters/threeAdapter.js';
import type { Position } from '../../../battle-replay/types/index.js';
import { historicalTraceVisitorLabel, type HistoricalTraceFeature, type HistoricalTraceVisualProgress } from '../../../battle-replay/visualization/historicalTraces.js';
import { HistoricalTerrainStyle } from './HistoricalTerrainStyle.js';
import { sampleTerrainSurfaceHeight, type TerrainAsset } from './ThreeTerrainController.js';

const SCALE = HistoricalTerrainStyle.terrain.worldUnitsPerMetre;
const TRACE_HALO_COLOR = 0x171714;

interface TraceMaterialState {
  material: THREE.Material & { opacity: number };
  baseOpacity: number;
  progressUniform?: { value: number };
}

interface TraceLineEntry {
  line: Line2;
  segmentCount: number;
}

interface TraceBorderEntry {
  line: THREE.LineLoop;
  vertexCount: number;
  progressive: boolean;
}

interface TraceEntry {
  feature: HistoricalTraceFeature;
  objects: THREE.Object3D[];
  lines: TraceLineEntry[];
  borders: TraceBorderEntry[];
  arrowHeads: Array<{ mesh: THREE.Mesh; line: Position[] }>;
  materials: TraceMaterialState[];
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
  if (feature.properties.side === 'pla') return 0x8a3b32;
  if (feature.properties.side === 'roc') return 0x315b70;
  return 0x766247;
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

function buildWideLine(
  line: Position[],
  terrain: TerrainAsset,
  color: number,
  opacity: number,
  linewidth: number,
  name: string,
  renderOrder: number,
) {
  const points = line.map(position => point(position, terrain));
  const geometry = new LineGeometry().setFromPoints(points);
  geometry.instanceCount = 0;
  const material = new LineMaterial({ color, linewidth, transparent: true, opacity, depthWrite: false, depthTest: false });
  material.resolution.set(1, 1);
  const wideLine = new Line2(geometry, material);
  wideLine.name = name;
  wideLine.renderOrder = renderOrder;
  wideLine.userData.featureId = name.replace(/-halo$/, '');
  wideLine.computeLineDistances();
  return { line: wideLine, segmentCount: Math.max(0, points.length - 1) };
}

function createRevealMaterial(color: number, opacity: number, progressUniform: { value: number }) {
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, depthTest: false, side: THREE.DoubleSide });
  material.onBeforeCompile = shader => {
    shader.uniforms.traceProgress = progressUniform;
    shader.vertexShader = `attribute float traceReveal;\nvarying float vTraceReveal;\n${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nvTraceReveal = traceReveal;',
    );
    shader.fragmentShader = `uniform float traceProgress;\nvarying float vTraceReveal;\n${shader.fragmentShader}`.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      float revealEdge = smoothstep(traceProgress - 0.055, traceProgress, vTraceReveal);
      diffuseColor.a *= 1.0 - revealEdge;`,
    );
  };
  material.customProgramCacheKey = () => 'historical-trace-corridor-reveal-v1';
  return material;
}

function revealValues(projected: THREE.Vector3[]) {
  const origin = new THREE.Vector2(projected[0]?.x ?? 0, projected[0]?.z ?? 0);
  let target = origin.clone();
  let farthest = -1;
  for (const item of projected.slice(1)) {
    const distance = origin.distanceToSquared(new THREE.Vector2(item.x, item.z));
    if (distance > farthest) {
      farthest = distance;
      target.set(item.x, item.z);
    }
  }
  const axis = target.sub(origin);
  const lengthSquared = Math.max(axis.lengthSq(), .000001);
  return projected.map(item => THREE.MathUtils.clamp(
    (new THREE.Vector2(item.x, item.z).sub(origin).dot(axis)) / lengthSquared,
    0,
    1,
  ));
}

function buildPolygon(feature: HistoricalTraceFeature, terrain: TerrainAsset, color: number, progressive: boolean) {
  const group = new THREE.Group();
  const materials: TraceMaterialState[] = [];
  const borders: TraceBorderEntry[] = [];
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
    const progressUniform = { value: 0 };
    const material = progressive
      ? createRevealMaterial(color, .2, progressUniform)
      : new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .2, depthWrite: false, depthTest: false, side: THREE.DoubleSide });
    if (progressive) geometry.setAttribute('traceReveal', new THREE.Float32BufferAttribute(revealValues(projected), 1));
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = feature.id + '-area';
    mesh.renderOrder = 31;
    group.add(mesh);
    materials.push({ material, baseOpacity: .2, progressUniform: progressive ? progressUniform : undefined });

    const border = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(projected.map(item => new THREE.Vector3(item.x, item.y + .012, item.z))),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: .72, depthWrite: false, depthTest: false }),
    );
    border.name = feature.id + '-border';
    border.renderOrder = 32;
    border.geometry.setDrawRange(0, progressive ? 0 : projected.length);
    group.add(border);
    borders.push({ line: border, vertexCount: projected.length, progressive });
    materials.push({ material: border.material as THREE.LineBasicMaterial, baseOpacity: .72 });
  }
  return { group, materials, borders };
}

function labelObject(feature: HistoricalTraceFeature, terrain: TerrainAsset, position: Position, onSelect: (id: string) => void) {
  const label = historicalTraceVisitorLabel(feature);
  const offsetClass = {
    'HBT-PLA-ARROW-01': 'three-historical-trace-label--offset-landing',
    'HBT-PLA-ARROW-02': 'three-historical-trace-label--offset-inland',
    'HBT-PLA-CORRIDOR-01': 'three-historical-trace-label--offset-area',
    'HBT-PLA-ARROW-03': 'three-historical-trace-label--offset-north',
    'HBT-ROC-ARROW-01': 'three-historical-trace-label--offset-counterattack',
    'HBT-ROC-ARROW-02': 'three-historical-trace-label--offset-west',
    'HBT-ROC-ARROW-03': 'three-historical-trace-label--offset-defense',
    'HBT-ROC-FRONT-01': 'three-historical-trace-label--offset-front-north',
    'HBT-ROC-FRONT-02': 'three-historical-trace-label--offset-front-south',
    'HBT-BATTLE-AREA-01': 'three-historical-trace-label--offset-area-center',
    'HBT-BATTLE-AREA-02': 'three-historical-trace-label--offset-area-north',
  }[feature.id] ?? '';
  const element = document.createElement('button');
  element.type = 'button';
  element.className = `three-historical-trace-label three-historical-trace-label--${feature.properties.side ?? 'unknown'} ${offsetClass}`;
  element.textContent = label;
  element.setAttribute('aria-label', label);
  element.dataset.traceFeatureId = feature.id;
  element.dataset.visitorLabel = label;
  element.addEventListener('click', event => {
    event.stopPropagation();
    onSelect(feature.id);
  });
  const object = new CSS2DObject(element);
  object.position.copy(point(position, terrain, .16));
  object.name = feature.id + '-label';
  object.userData.featureId = feature.id;
  return object;
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
  const direction = new THREE.Vector2(after.x - before.x, after.z - before.z);
  if (direction.lengthSq() < .000001) direction.set(1, 0);
  direction.normalize();
  const normal = new THREE.Vector2(-direction.y, direction.x);
  const length = .15;
  const width = .095;
  const base = new THREE.Vector2(tip.x - direction.x * length, tip.z - direction.y * length);
  const attribute = mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
  attribute.setXYZ(0, tip.x, tip.y, tip.z);
  attribute.setXYZ(1, base.x + normal.x * width, tip.y, base.y + normal.y * width);
  attribute.setXYZ(2, base.x - normal.x * width, tip.y, base.y - normal.y * width);
  attribute.needsUpdate = true;
  mesh.geometry.computeBoundingSphere();
}

export class ThreeHistoricalTraceLayer {
  readonly group = new THREE.Group();
  private readonly labelGroup = new THREE.Group();
  private readonly entries = new Map<string, TraceEntry>();
  private progressById = new Map<string, HistoricalTraceVisualProgress>();
  private labelsEnabled = true;

  constructor(
    private readonly terrain: TerrainAsset,
    private readonly mobile: boolean,
    _reducedMotion: boolean,
    private readonly onSelect: (id: string) => void,
  ) {
    this.group.name = 'historical-map-source-traces';
    this.group.renderOrder = 30;
    this.labelGroup.name = 'historical-map-source-trace-labels';
    this.group.add(this.labelGroup);
  }

  update(features: HistoricalTraceFeature[], labelsEnabled: boolean) {
    this.labelsEnabled = labelsEnabled;
    this.disposeObjects();
    let mobileLabels = 0;
    for (const feature of features) {
      const color = sideColor(feature);
      const entry: TraceEntry = { feature, objects: [], lines: [], borders: [], arrowHeads: [], materials: [] };
      const isArrow = feature.properties.featureType === 'historical_attack_arrow';
      const isCorridor = feature.properties.featureType === 'historical_movement_corridor';
      if (feature.properties.featureType === 'battle_area' || isCorridor) {
        const area = buildPolygon(feature, this.terrain, color, isCorridor);
        this.group.add(area.group);
        entry.objects.push(area.group);
        entry.materials.push(...area.materials);
        entry.borders.push(...area.borders);
      }
      for (const line of lineStrings(feature)) {
        if (line.length < 2) continue;
        const lineWidth = this.mobile ? 3.8 : 3.2;
        const halo = buildWideLine(line, this.terrain, TRACE_HALO_COLOR, isArrow ? .34 : .27, lineWidth + 2.2, `${feature.id}-halo`, 33);
        const object = buildWideLine(line, this.terrain, color, isArrow ? .94 : .88, lineWidth, feature.id, 34);
        this.group.add(halo.line, object.line);
        entry.objects.push(halo.line, object.line);
        entry.lines.push(halo, object);
        entry.materials.push(
          { material: halo.line.material as LineMaterial, baseOpacity: isArrow ? .34 : .27 },
          { material: object.line.material as LineMaterial, baseOpacity: isArrow ? .94 : .88 },
        );
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
      const showMobileLabel = !this.mobile || mobileLabels < 5 && ['historical_attack_arrow', 'battle_front', 'defensive_line'].includes(feature.properties.featureType);
      if (labelPosition && labelsEnabled && showMobileLabel) {
        this.labelGroup.add(labelObject(feature, this.terrain, labelPosition, this.onSelect));
        if (this.mobile) mobileLabels += 1;
      }
      this.entries.set(feature.id, entry);
      this.progressById.set(feature.id, { reveal: 1, opacity: 1 });
    }
  }

  updateProgress(progressById: Map<string, HistoricalTraceVisualProgress>) {
    this.progressById = new Map(progressById);
    for (const entry of this.entries.values()) this.applyProgress(entry, this.progressById.get(entry.feature.id) ?? { reveal: 0, opacity: 0 });
  }

  tick(localMix: number, cameraDistance: number) {
    this.group.visible = localMix > .02 && this.entries.size > 0;
    this.labelGroup.visible = this.labelsEnabled && this.group.visible && cameraDistance < 20;
    for (const entry of this.entries.values()) this.applyProgress(entry, this.progressById.get(entry.feature.id) ?? { reveal: 0, opacity: 0 });
    this.labelGroup.traverse(object => {
      if (!(object instanceof CSS2DObject)) return;
      const feature = this.entries.get(String(object.userData.featureId));
      const progress = feature ? this.progressById.get(feature.feature.id)?.opacity ?? 0 : 0;
      object.element.style.opacity = String(Math.min(1, localMix * 1.25 * (progress > .01 ? 1 : 0)));
    });
  }

  private applyProgress(entry: TraceEntry, visualProgress: HistoricalTraceVisualProgress) {
    const reveal = Math.max(0, Math.min(1, visualProgress.reveal));
    const opacity = Math.max(0, Math.min(1, visualProgress.opacity));
    for (const lineEntry of entry.lines) {
      const count = reveal <= .01 ? 0 : Math.max(1, Math.ceil(reveal * lineEntry.segmentCount));
      lineEntry.line.geometry.instanceCount = count;
    }
    for (const border of entry.borders) {
      const count = border.progressive
        ? reveal <= .01 ? 0 : Math.max(2, Math.ceil(reveal * border.vertexCount))
        : reveal <= .01 ? 0 : border.vertexCount;
      border.line.geometry.setDrawRange(0, count);
    }
    for (const arrowHead of entry.arrowHeads) updateArrowHead(arrowHead.mesh, arrowHead.line, this.terrain, reveal);
    for (const state of entry.materials) {
      state.material.opacity = state.baseOpacity * opacity;
      if (state.progressUniform) state.progressUniform.value = reveal;
    }
  }

  resize(width: number, height: number) {
    this.group.traverse(object => {
      if (object instanceof Line2) (object.material as LineMaterial).resolution.set(width, height);
    });
  }

  private disposeObjects() {
    for (const entry of this.entries.values()) {
      for (const object of entry.objects) {
        object.traverse(child => {
          if (child instanceof CSS2DObject) child.element.remove();
          if (child instanceof THREE.Mesh || child instanceof THREE.Line || child instanceof THREE.LineLoop) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) child.material.forEach(material => material.dispose());
            else child.material.dispose();
          }
        });
      }
    }
    this.labelGroup.traverse(object => {
      if (object instanceof CSS2DObject) object.element.remove();
    });
    this.entries.clear();
    this.progressById.clear();
    this.group.clear();
    this.labelGroup.clear();
    this.group.add(this.labelGroup);
  }

  dispose() {
    this.disposeObjects();
  }
}
