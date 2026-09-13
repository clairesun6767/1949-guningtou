import type { EntityId } from '../types/index.js';
import type { RuntimeEvent } from './types.js';

export interface EventTransition {
  currentTime: number;
  previousTime?: number;
  activeEvents: RuntimeEvent[];
  enteredEvents: RuntimeEvent[];
  exitedEvents: RuntimeEvent[];
}

export function isRuntimeEventActive(event: RuntimeEvent, currentTime: number) {
  if (!Number.isFinite(currentTime) || event.startTime === undefined || !Number.isFinite(event.startTime)) return false;
  if (event.endTime !== undefined && (!Number.isFinite(event.endTime) || event.endTime <= event.startTime)) return false;
  return currentTime >= event.startTime && (event.endTime === undefined || currentTime < event.endTime);
}

export function activeRuntimeEvents(events: RuntimeEvent[], currentTime: number) {
  return events.filter(event => isRuntimeEventActive(event, currentTime));
}

function ids(events: RuntimeEvent[]) {
  return new Set<EntityId>(events.map(event => event.id));
}

export function evaluateEventTransition(events: RuntimeEvent[], currentTime: number, previousTime?: number): EventTransition {
  const activeEvents = activeRuntimeEvents(events, currentTime);
  const previousEvents = previousTime === undefined ? [] : activeRuntimeEvents(events, previousTime);
  const activeIds = ids(activeEvents);
  const previousIds = ids(previousEvents);
  return {
    currentTime,
    previousTime,
    activeEvents,
    enteredEvents: activeEvents.filter(event => !previousIds.has(event.id)),
    exitedEvents: previousEvents.filter(event => !activeIds.has(event.id)),
  };
}

/** Event activation is a pure domain query; it has no renderer dependency. */
export class EventEngine {
  private previousTime: number | undefined;

  constructor(private readonly events: RuntimeEvent[]) {}

  evaluate(currentTime: number) {
    const transition = evaluateEventTransition(this.events, currentTime, this.previousTime);
    this.previousTime = currentTime;
    return transition;
  }

  reset(previousTime?: number) {
    this.previousTime = previousTime;
  }

  activeAt(currentTime: number) {
    return activeRuntimeEvents(this.events, currentTime);
  }
}

