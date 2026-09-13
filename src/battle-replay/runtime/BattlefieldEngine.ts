import type { EntityId } from '../types/index.js';
import { BattlefieldStore, createInitialBattlefieldState } from './BattlefieldState.js';
import { CameraDirector, type CameraDirectorPort } from './CameraDirector.js';
import { EventEngine } from './EventEngine.js';
import { TimelineEngine, type TimelineEngineOptions } from './TimelineEngine.js';
import type {
  BattlefieldMode,
  BattlefieldState,
  CameraCommand,
  RuntimeBattleData,
  RuntimeEvent,
  RuntimeStoryStep,
  RuntimeUnitSnapshot,
  TimelineSnapshot,
} from './types.js';
import { UnitSystem } from './UnitSystem.js';

export interface BattlefieldEngineOptions {
  data: RuntimeBattleData;
  timeline: TimelineEngineOptions;
  cameraPort?: CameraDirectorPort;
}

export interface BattlefieldEngineSnapshot {
  state: BattlefieldState;
  timeline: TimelineSnapshot;
  activeEvents: RuntimeEvent[];
  unitSnapshots: RuntimeUnitSnapshot[];
}

const NOOP_CAMERA_PORT: CameraDirectorPort = {
  execute: () => undefined,
  cancel: () => undefined,
  resume: () => undefined,
};

/**
 * The renderer-neutral orchestration boundary for the battlefield.
 *
 * Historical data enters through RuntimeBattleData, systems derive state, and
 * renderers consume snapshots through adapters. This class intentionally has
 * no Three.js, Cesium, DOM, or React dependency.
 */
export class BattlefieldEngine {
  readonly timeline: TimelineEngine;
  readonly events: EventEngine;
  readonly units: UnitSystem;
  readonly camera: CameraDirector;
  readonly state: BattlefieldStore;

  private readonly data: RuntimeBattleData;
  private readonly unsubscribeTimeline: () => boolean;

  constructor(options: BattlefieldEngineOptions) {
    this.data = options.data;
    this.timeline = new TimelineEngine(options.timeline);
    this.events = new EventEngine(options.data.events);
    this.units = new UnitSystem(options.data.units, options.data.routes);
    this.camera = new CameraDirector(options.cameraPort ?? NOOP_CAMERA_PORT);
    this.state = new BattlefieldStore(createInitialBattlefieldState(this.timeline.getCurrentTime()));
    this.unsubscribeTimeline = this.timeline.subscribe(snapshot => this.syncTimeline(snapshot));
    this.syncTimeline(this.timeline.getSnapshot());
  }

  play() {
    return this.timeline.play();
  }

  pause() {
    return this.timeline.pause();
  }

  seek(time: number) {
    return this.timeline.seek(time);
  }

  setSpeed(speed: number) {
    return this.timeline.setSpeed(speed);
  }

  setMode(mode: BattlefieldMode) {
    return this.state.dispatch({ type: 'SET_MODE', mode });
  }

  setResearchMode(researchMode: boolean) {
    this.units.setResearchMode(researchMode);
    this.state.dispatch({ type: 'SET_RESEARCH_MODE', researchMode });
    this.syncVisibleUnits(this.timeline.getCurrentTime());
    return this.state.getState();
  }

  selectPOI(poiId: EntityId | null) {
    return this.state.dispatch({ type: 'SELECT_POI', poiId });
  }

  selectRegion(regionId: EntityId | null) {
    return this.state.dispatch({ type: 'SELECT_REGION', regionId });
  }

  spawnUnit(unitId: EntityId) {
    this.units.spawn(unitId);
    this.syncVisibleUnits(this.timeline.getCurrentTime());
    return this.getSnapshot();
  }

  hideUnit(unitId: EntityId) {
    this.units.hide(unitId);
    this.syncVisibleUnits(this.timeline.getCurrentTime());
    return this.getSnapshot();
  }

  clearUnitVisibilityOverride(unitId: EntityId) {
    this.units.clearVisibilityOverride(unitId);
    this.syncVisibleUnits(this.timeline.getCurrentTime());
    return this.getSnapshot();
  }

  orbit(command: Extract<CameraCommand, { type: 'orbit' }>) {
    return this.camera.orbit(command);
  }

  flyTo(command: Extract<CameraCommand, { type: 'fly-to' }>) {
    return this.camera.flyTo(command);
  }

  follow(command: Extract<CameraCommand, { type: 'follow' }>) {
    return this.camera.follow(command);
  }

  lookAt(command: Extract<CameraCommand, { type: 'look-at' }>) {
    return this.camera.lookAt(command);
  }

  cinematicPath(command: Extract<CameraCommand, { type: 'cinematic-path' }>) {
    return this.camera.cinematicPath(command);
  }

  freeExplore() {
    return this.camera.freeExplore();
  }

  interruptCamera(command: CameraCommand) {
    return this.camera.interrupt(command);
  }

  resumeCamera() {
    return this.camera.resume();
  }

  cancelCamera() {
    return this.camera.cancel();
  }

  getData() {
    return this.data;
  }

  getActiveEvents() {
    return this.events.activeAt(this.timeline.getCurrentTime());
  }

  getUnitSnapshots() {
    return this.units.getSnapshotsAt(this.timeline.getCurrentTime());
  }

  getVisibleUnitSnapshots() {
    return this.units.getVisibleUnitsAt(this.timeline.getCurrentTime());
  }

  /** Returns the latest story narration at or before the current time. */
  getNarration(storyId: EntityId): RuntimeStoryStep | undefined {
    const story = this.data.stories.find(item => item.id === storyId);
    if (!story) return undefined;
    const currentTime = this.timeline.getCurrentTime();
    return story.steps
      .filter(step => step.time !== undefined && step.time <= currentTime && step.narration)
      .at(-1);
  }

  getSnapshot(): BattlefieldEngineSnapshot {
    return {
      state: this.state.getState(),
      timeline: this.timeline.getSnapshot(),
      activeEvents: this.getActiveEvents(),
      unitSnapshots: this.getUnitSnapshots(),
    };
  }

  subscribe(listener: (snapshot: BattlefieldEngineSnapshot) => void) {
    return this.state.subscribe(() => listener(this.getSnapshot()));
  }

  dispose() {
    this.unsubscribeTimeline();
    this.timeline.dispose();
  }

  private syncTimeline(snapshot: TimelineSnapshot) {
    const transition = this.events.evaluate(snapshot.currentTime);
    this.state.dispatch({ type: 'SET_TIME', currentTime: snapshot.currentTime });
    this.state.dispatch({ type: 'SET_ACTIVE_EVENTS', eventIds: transition.activeEvents.map(event => event.id) });
    this.syncVisibleUnits(snapshot.currentTime);
  }

  private syncVisibleUnits(currentTime: number) {
    this.state.dispatch({
      type: 'SET_VISIBLE_UNITS',
      unitIds: this.units.getVisibleUnitsAt(currentTime).map(unit => unit.unitId),
    });
  }
}
