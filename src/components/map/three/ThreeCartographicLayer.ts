import * as THREE from 'three';
import { wgs84ToLocalMeters } from '../../../battle-replay/visualization/adapters/threeAdapter.js';
import type { Position } from '../../../battle-replay/types/index.js';
import type { MapLayerId } from '../../../battle-replay/visualization/types.js';
import type { CartographicAsset, CartographicFeature } from './CartographicAsset.js';
import { HistoricalCartographicStyle, type CartographicLayerId } from './HistoricalCartographicStyle.js';
import { HistoricalTerrainStyle } from './HistoricalTerrainStyle.js';
import { isTerrainCoverageSample, sampleTerrainSurfaceHeight, type TerrainAsset, type TerrainCoverageMask } from './ThreeTerrainController.js';

const SCALE = HistoricalTerrainStyle.terrain.worldUnitsPerMetre;

interface MaterialState {
  material: THREE.Material & { opacity: number };
  baseOpacity: number;
  scope: 'regional' | 'local';
}

interface ScopeBundle {
  root: THREE.Group;
  layers: Map<CartographicLayerId, THREE.Group>;
  counts: Record<string, number>;
}

function localPoint([longitude, latitude]: Position) {
  const point = wgs84ToLocalMeters([longitude, latitude]);
  return new THREE.Vector2(point.eastMetres * SCALE, -point.northMetres * SCALE);
}

function lineStrings(feature: CartographicFeature): Position[][] {
  if (feature.geometry.type === 'LineString') return [feature.geometry.coordinates];
  if (feature.geometry.type === 'MultiLineString') return feature.geometry.coordinates;
  return [];
}

function polygonRings(feature: CartographicFeature): Position[][] {
  if (feature.geometry.type === 'Polygon') return [feature.geometry.coordinates[0]];
  if (feature.geometry.type === 'MultiPolygon') return feature.geometry.coordinates.map(polygon => polygon[0]);
  return [];
}

function featureCoordinates(feature: CartographicFeature): Position[] {
  const coordinates: Position[] = [];
  if (feature.geometry.type === 'LineString') coordinates.push(...feature.geometry.coordinates);
  else if (feature.geometry.type === 'MultiLineString') coordinates.push(...feature.geometry.coordinates.flat());
  else if (feature.geometry.type === 'Polygon') coordinates.push(...feature.geometry.coordinates.flat());
  else coordinates.push(...feature.geometry.coordinates.flat(2));
  return coordinates;
}

function featureTouchesCoverage(feature: CartographicFeature, coverage: TerrainCoverageMask) {
  const coordinates = featureCoordinates(feature);
  if (coordinates.some(coordinate => isTerrainCoverageSample(coverage, coordinate))) return true;
  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const [longitude, latitude] = coordinates[index];
    const [nextLongitude, nextLatitude] = coordinates[index + 1];
    const midpoint: Position = [(longitude + nextLongitude) / 2, (latitude + nextLatitude) / 2];
    if (isTerrainCoverageSample(coverage, midpoint)) return true;
  }
  return false;
}

function colorFor(category: string) {
  const colors = HistoricalCartographicStyle.surface;
  switch (category) {
    case 'agriculture': return colors.agriculture;
    case 'forest': return colors.forest;
    case 'settlement': return colors.settlement;
    case 'settlement-block': return colors.settlementBlock;
    case 'beach': return colors.beach;
    case 'road-primary': return colors.roadPrimary;
    case 'road-secondary': return colors.roadSecondary;
    case 'road-local': return colors.roadLocal;
    default: return colors.openGround;
  }
}

function opacityFor(category: string) {
  const opacity = HistoricalCartographicStyle.opacity;
  if (category === 'agriculture') return opacity.agriculture;
  if (category === 'forest') return opacity.forest;
  if (category === 'settlement' || category === 'settlement-block') return opacity.settlement;
  if (category === 'beach') return opacity.beach;
  if (category.startsWith('road-')) return opacity.roads;
  return opacity.openGround;
}

function roadWidth(category: string) {
  if (category === 'road-primary') return HistoricalCartographicStyle.roadWidthWorldUnits.primary;
  if (category === 'road-secondary') return HistoricalCartographicStyle.roadWidthWorldUnits.secondary;
  return HistoricalCartographicStyle.roadWidthWorldUnits.local;
}

function layerId(category: string): CartographicLayerId {
  if (category.startsWith('road-')) return 'roads';
  if (category === 'forest') return 'vegetation';
  if (category === 'settlement' || category === 'settlement-block') return 'settlements';
  if (category === 'beach') return 'beaches';
  return 'land-cover';
}

function densify(line: Position[], maximumWorldDistance = .12) {
  const output: Position[] = [];
  for (let index = 0; index < line.length - 1; index += 1) {
    const start = line[index];
    const end = line[index + 1];
    const a = localPoint(start);
    const b = localPoint(end);
    const segments = Math.max(1, Math.ceil(a.distanceTo(b) / maximumWorldDistance));
    for (let segment = 0; segment < segments; segment += 1) {
      const t = segment / segments;
      output.push([
        start[0] + (end[0] - start[0]) * t,
        start[1] + (end[1] - start[1]) * t,
      ]);
    }
  }
  if (line.length) output.push(line.at(-1)!);
  return output;
}

function material(color: number, opacity: number) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: .94,
    metalness: 0,
    transparent: true,
    opacity,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    side: THREE.FrontSide,
  });
}

function buildRoadMesh(features: CartographicFeature[], terrain: TerrainAsset, category: string) {
  const positions: number[] = [];
  const indices: number[] = [];
  const halfWidth = roadWidth(category) / 2;
  for (const feature of features) {
    for (const sourceLine of lineStrings(feature)) {
      const line = densify(sourceLine);
      if (line.length < 2) continue;
      const projected = line.map(localPoint);
      const base = positions.length / 3;
      for (let index = 0; index < projected.length; index += 1) {
        const previous = projected[Math.max(0, index - 1)];
        const next = projected[Math.min(projected.length - 1, index + 1)];
        const tangent = next.clone().sub(previous).normalize();
        const normal = new THREE.Vector2(-tangent.y, tangent.x).multiplyScalar(halfWidth);
        const [longitude, latitude] = line[index];
        const y = sampleTerrainSurfaceHeight(terrain, longitude, latitude, HistoricalCartographicStyle.terrain.verticalExaggeration)
          + HistoricalCartographicStyle.heightOffsetWorldUnits.road;
        positions.push(projected[index].x + normal.x, y, projected[index].y + normal.y);
        positions.push(projected[index].x - normal.x, y, projected[index].y - normal.y);
      }
      for (let index = 0; index < projected.length - 1; index += 1) {
        const a = base + index * 2;
        indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
  }
  if (!indices.length) return null;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material(colorFor(category), opacityFor(category)));
  mesh.name = `cartographic-${category}`;
  mesh.receiveShadow = true;
  return mesh;
}

function buildBuildingBlocks(features: CartographicFeature[], terrain: TerrainAsset, mobile: boolean) {
  const retained = features.slice(0, mobile ? 180 : 650);
  if (!retained.length) return null;
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const buildingMaterial = material(HistoricalCartographicStyle.surface.settlementBlock, .94);
  const mesh = new THREE.InstancedMesh(geometry, buildingMaterial, retained.length);
  const matrix = new THREE.Matrix4();
  const rotation = new THREE.Quaternion();
  retained.forEach((feature, index) => {
    const ring = polygonRings(feature)[0] ?? [];
    const points = ring.map(localPoint);
    const box = new THREE.Box2().setFromPoints(points);
    const centre = box.getCenter(new THREE.Vector2());
    const size = box.getSize(new THREE.Vector2());
    const coordinates = ring[Math.floor(ring.length / 2)] ?? ring[0];
    if (!coordinates) return;
    const hash = [...feature.properties.id].reduce((sum, character) => sum + character.charCodeAt(0), 0);
    const height = .0045 + (hash % 5) * .0007;
    matrix.compose(
      new THREE.Vector3(centre.x, sampleTerrainSurfaceHeight(terrain, coordinates[0], coordinates[1], HistoricalCartographicStyle.terrain.verticalExaggeration) + height / 2 + .001, centre.y),
      rotation,
      new THREE.Vector3(Math.max(.006, Math.min(.045, size.x)), height, Math.max(.006, Math.min(.045, size.y))),
    );
    mesh.setMatrixAt(index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.name = 'cartographic-settlement-blocks';
  mesh.castShadow = !mobile;
  mesh.receiveShadow = true;
  return mesh;
}

function buildCoastline(asset: CartographicAsset, terrain: TerrainAsset, exclusion?: TerrainCoverageMask) {
  const positions: number[] = [];
  for (const feature of asset.features) {
    for (const ring of polygonRings(feature)) {
      for (let index = 0; index < ring.length - 1; index += 1) {
        if (exclusion && featureTouchesCoverage({
          type: 'Feature',
          properties: asset.features[0]?.properties ?? {
            id: 'coastline-segment',
            layer: 'coastline',
            category: 'coastline',
            referenceEra: 'modern_reference',
            source: 'OSM',
            license: 'ODbL',
          },
          geometry: { type: 'LineString', coordinates: [ring[index], ring[index + 1]] },
        }, exclusion)) continue;
        for (const coordinate of [ring[index], ring[index + 1]]) {
          const point = localPoint(coordinate);
          positions.push(
            point.x,
            sampleTerrainSurfaceHeight(terrain, coordinate[0], coordinate[1], HistoricalCartographicStyle.terrain.verticalExaggeration) + HistoricalCartographicStyle.heightOffsetWorldUnits.coastline,
            point.y,
          );
        }
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const lineMaterial = new THREE.LineBasicMaterial({ color: HistoricalCartographicStyle.surface.coastline, transparent: true, opacity: .9 });
  const lines = new THREE.LineSegments(geometry, lineMaterial);
  lines.name = 'cartographic-osm-coastline';
  return lines;
}

export class ThreeCartographicLayer {
  readonly group = new THREE.Group();
  private readonly materialStates: MaterialState[] = [];
  private readonly regional: ScopeBundle;
  private readonly local: ScopeBundle;

  constructor(
    regionalCartography: CartographicAsset,
    localCartography: CartographicAsset,
    regionalCoastline: CartographicAsset,
    localCoastline: CartographicAsset,
    regionalTerrain: TerrainAsset,
    localTerrain: TerrainAsset,
    mobile: boolean,
    localCoverage?: TerrainCoverageMask,
  ) {
    this.group.name = 'semantic-cartographic-stack';
    this.regional = this.buildScope('regional', regionalCartography, regionalCoastline, regionalTerrain, mobile, localCoverage);
    this.local = this.buildScope('local', localCartography, localCoastline, localTerrain, mobile);
    this.local.root.visible = false;
    this.group.add(this.regional.root, this.local.root);
  }

  private buildScope(scope: 'regional' | 'local', cartography: CartographicAsset, coastline: CartographicAsset, terrain: TerrainAsset, mobile: boolean, localExclusion?: TerrainCoverageMask): ScopeBundle {
    const root = new THREE.Group();
    root.name = `${scope}-cartography`;
    const layers = new Map<CartographicLayerId, THREE.Group>();
    for (const id of ['coastline', 'land-cover', 'roads', 'settlements', 'vegetation', 'beaches'] as CartographicLayerId[]) {
      const layer = new THREE.Group();
      layer.name = `${scope}-${id}`;
      layers.set(id, layer);
      root.add(layer);
    }
    const coastlineLines = buildCoastline(coastline, terrain, localExclusion);
    layers.get('coastline')!.add(coastlineLines);
    this.track(coastlineLines.material as THREE.LineBasicMaterial, .9, scope);

    const categories = new Map<string, CartographicFeature[]>();
    for (const feature of cartography.features) {
      const list = categories.get(feature.properties.category) ?? [];
      list.push(feature);
      categories.set(feature.properties.category, list);
    }
    for (const [category, features] of categories) {
      const retained = localExclusion && category.startsWith('road-') ? features.filter(feature => !featureTouchesCoverage(feature, localExclusion)) : features;
      const object = category.startsWith('road-')
        ? buildRoadMesh(retained, terrain, category)
        : category === 'settlement-block'
          ? buildBuildingBlocks(retained, terrain, mobile)
          : null;
      if (!object) continue;
      layers.get(layerId(category))!.add(object);
      const objectMaterial = (object as THREE.Mesh).material;
      if (Array.isArray(objectMaterial)) objectMaterial.forEach(value => this.track(value as THREE.Material & { opacity: number }, opacityFor(category), scope));
      else this.track(objectMaterial as THREE.Material & { opacity: number }, opacityFor(category), scope);
    }
    const counts = cartography.features.reduce<Record<string, number>>((result, feature) => {
      result[feature.properties.category] = (result[feature.properties.category] ?? 0) + 1;
      return result;
    }, { coastline: coastline.features.length });
    return { root, layers, counts };
  }

  private track(materialValue: THREE.Material & { opacity: number }, baseOpacity: number, scope: 'regional' | 'local') {
    materialValue.transparent = true;
    this.materialStates.push({ material: materialValue, baseOpacity, scope });
  }

  updateVisibility(enabled: Set<MapLayerId>) {
    for (const bundle of [this.regional, this.local]) {
      for (const [id, group] of bundle.layers) group.visible = enabled.has(id);
    }
  }

  tick(regionalOpacity: number, localOpacity: number, battleFocus = false) {
    this.regional.root.visible = regionalOpacity > .01;
    this.local.root.visible = localOpacity > .01;
    for (const state of this.materialStates) {
      const focusDim = battleFocus ? .72 : 1;
      const target = state.baseOpacity * (state.scope === 'regional' ? regionalOpacity : localOpacity) * focusDim;
      state.material.opacity += (target - state.material.opacity) * .08;
      state.material.depthWrite = state.material.opacity > state.baseOpacity * .95;
    }
  }

  getCounts() {
    return { regional: this.regional.counts, local: this.local.counts };
  }

  dispose() {
    this.group.traverse(object => {
      if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) object.material.forEach(value => value.dispose());
        else object.material.dispose();
      }
    });
    this.group.clear();
  }
}
