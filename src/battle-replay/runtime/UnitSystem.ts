import type { EntityId, Position } from '../types/index.js';
import type { RuntimeRoute, RuntimeUnit, RuntimeUnitSnapshot } from './types.js';

function activeInWindow(time: number, startTime?: number, endTime?: number) {
  if (!Number.isFinite(time)) return false;
  if (startTime !== undefined && (!Number.isFinite(startTime) || time < startTime)) return false;
  if (endTime !== undefined && (!Number.isFinite(endTime) || time >= endTime)) return false;
  return true;
}

function interpolate(a: Position, b: Position, t: number): Position {
  const longitude = a[0] + (b[0] - a[0]) * t;
  const latitude = a[1] + (b[1] - a[1]) * t;
  if (a.length > 2 || b.length > 2) return [longitude, latitude, (a[2] ?? 0) + ((b[2] ?? 0) - (a[2] ?? 0)) * t];
  return [longitude, latitude];
}

export function interpolateRoutePosition(route: RuntimeRoute, currentTime: number): { position: Position; progress: number } | undefined {
  if (route.coordinates.length < 2 || route.startTime === undefined || route.endTime === undefined || route.endTime <= route.startTime) return undefined;
  const progress = Math.max(0, Math.min(1, (currentTime - route.startTime) / (route.endTime - route.startTime)));
  if (progress <= 0) return { position: route.coordinates[0], progress: 0 };
  if (progress >= 1) return { position: route.coordinates.at(-1)!, progress: 1 };

  const lengths: number[] = [];
  let total = 0;
  for (let index = 0; index < route.coordinates.length - 1; index += 1) {
    const [longitude, latitude] = route.coordinates[index];
    const [nextLongitude, nextLatitude] = route.coordinates[index + 1];
    const length = Math.hypot(nextLongitude - longitude, nextLatitude - latitude);
    lengths.push(length);
    total += length;
  }
  if (total === 0) return { position: route.coordinates[0], progress };
  let remaining = progress * total;
  for (let index = 0; index < lengths.length; index += 1) {
    const length = lengths[index];
    if (remaining <= length) return { position: interpolate(route.coordinates[index], route.coordinates[index + 1], length === 0 ? 0 : remaining / length), progress };
    remaining -= length;
  }
  return { position: route.coordinates.at(-1)!, progress: 1 };
}

export interface UnitSystemOptions {
  researchMode?: boolean;
}

/** Runtime unit projection. It never creates a historical position absent from its input. */
export class UnitSystem {
  private readonly manualVisibility = new Map<EntityId, boolean>();
  private researchMode: boolean;
  private readonly routesById: Map<EntityId, RuntimeRoute>;

  constructor(private readonly units: RuntimeUnit[], routes: RuntimeRoute[], options: UnitSystemOptions = {}) {
    this.researchMode = options.researchMode ?? false;
    this.routesById = new Map(routes.map(route => [route.id, route]));
  }

  setResearchMode(enabled: boolean) {
    this.researchMode = enabled;
  }

  spawn(unitId: EntityId) {
    this.requireUnit(unitId);
    this.manualVisibility.set(unitId, true);
  }

  hide(unitId: EntityId) {
    this.requireUnit(unitId);
    this.manualVisibility.set(unitId, false);
  }

  clearVisibilityOverride(unitId: EntityId) {
    this.requireUnit(unitId);
    this.manualVisibility.delete(unitId);
  }

  getSnapshotsAt(currentTime: number): RuntimeUnitSnapshot[] {
    return this.units.map(unit => {
      const manuallyVisible = this.manualVisibility.get(unit.id);
      const active = activeInWindow(currentTime, unit.startTime, unit.endTime);
      const route = unit.routeId ? this.routesById.get(unit.routeId) : undefined;
      const routeAllowed = !route || (!route.researchOnly || this.researchMode) && (route.historicalRouteStatus === 'verified' || this.researchMode);
      const routePosition = route && routeAllowed ? interpolateRoutePosition(route, currentTime) : undefined;
      const position = routePosition?.position ?? unit.position;
      const visible = Boolean(active && routeAllowed && position && (manuallyVisible ?? true) && (!unit.researchOnly || this.researchMode));
      return {
        unitId: unit.id,
        visible,
        active,
        position: visible ? position : undefined,
        routeId: route?.id,
        progress: routePosition?.progress,
        status: visible && routePosition ? 'moving' : unit.status,
      };
    });
  }

  getVisibleUnitsAt(currentTime: number) {
    return this.getSnapshotsAt(currentTime).filter(snapshot => snapshot.visible);
  }

  private requireUnit(unitId: EntityId) {
    if (!this.units.some(unit => unit.id === unitId)) throw new Error(`Unknown unit: ${unitId}`);
  }
}

