import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BattlefieldEngine,
  BattlefieldStore,
  CameraDirector,
  EventEngine,
  TimelineEngine,
  UnitSystem,
  adaptBattlePackage,
  confidenceToEvidenceLevel,
  createInitialBattlefieldState,
} from '../../node_modules/.cache/battle-replay/runtime/index.js';
import { NON_HISTORICAL_TEST_DATA } from '../fixtures/battlefield-runtime-fixtures.mjs';

test('TimelineEngine advances, clamps, seeks, and emits renderer-neutral snapshots', () => {
  const engine = new TimelineEngine({ ...NON_HISTORICAL_TEST_DATA.timeline, speed: 2 });
  const snapshots = [];
  engine.subscribe(snapshot => snapshots.push(snapshot));

  assert.equal(engine.getCurrentTime(), 10);
  assert.equal(engine.play().playing, true);
  assert.equal(engine.advanceBy(25).currentTime, 60);
  assert.equal(engine.pause().playing, false);

  assert.equal(engine.seek(-1).currentTime, 0);
  assert.equal(engine.seek(999).currentTime, 100);
  assert.ok(snapshots.length >= 4);
  assert.equal(snapshots.at(-1).currentTime, 100);
  engine.dispose();
});

test('TimelineEngine is deterministic with an injected wall clock and frame scheduler', () => {
  let wallTime = 0;
  let frameCallback;
  let nextHandle = 0;
  const engine = new TimelineEngine({
    startTime: 0,
    endTime: 1,
    now: () => wallTime,
    requestFrame: callback => {
      frameCallback = callback;
      nextHandle += 1;
      return nextHandle;
    },
    cancelFrame: () => undefined,
  });

  engine.setSpeed(1 / 1000);
  engine.play();
  wallTime = 250;
  frameCallback(250);
  assert.equal(engine.getCurrentTime(), 0.25);
  engine.pause();
  engine.dispose();
});

test('EventEngine reports active, entered, and exited events across a time transition', () => {
  const engine = new EventEngine(NON_HISTORICAL_TEST_DATA.events);

  assert.deepEqual(engine.evaluate(0).activeEvents, []);
  const arrival = engine.evaluate(25);
  assert.deepEqual(arrival.activeEvents.map(event => event.id), [
    'TEST-EVENT-ARRIVAL',
    'TEST-EVENT-COUNTER',
  ]);
  assert.deepEqual(arrival.enteredEvents.map(event => event.id), [
    'TEST-EVENT-ARRIVAL',
    'TEST-EVENT-COUNTER',
  ]);

  const counterOnly = engine.evaluate(35);
  assert.deepEqual(counterOnly.activeEvents.map(event => event.id), ['TEST-EVENT-COUNTER']);
  assert.deepEqual(counterOnly.exitedEvents.map(event => event.id), ['TEST-EVENT-ARRIVAL']);
});

test('UnitSystem interpolates verified routes and keeps research-only units hidden by default', () => {
  const system = new UnitSystem(NON_HISTORICAL_TEST_DATA.units, NON_HISTORICAL_TEST_DATA.routes);
  const snapshots = system.getSnapshotsAt(50);
  const roc = snapshots.find(snapshot => snapshot.unitId === 'TEST-UNIT-ROC');
  const research = snapshots.find(snapshot => snapshot.unitId === 'TEST-UNIT-RESEARCH');

  assert.equal(roc.visible, true);
  assert.deepEqual(roc.position, [119, 24]);
  assert.equal(roc.progress, 0.5);
  assert.equal(research.visible, false);

  system.setResearchMode(true);
  assert.equal(system.getVisibleUnitsAt(50).some(unit => unit.unitId === 'TEST-UNIT-RESEARCH'), true);
  system.hide('TEST-UNIT-ROC');
  assert.equal(system.getVisibleUnitsAt(50).some(unit => unit.unitId === 'TEST-UNIT-ROC'), false);
  system.clearVisibilityOverride('TEST-UNIT-ROC');
  assert.equal(system.getVisibleUnitsAt(50).some(unit => unit.unitId === 'TEST-UNIT-ROC'), true);
});

test('BattlefieldStore centralizes time, mode, selection, and derived visibility IDs', () => {
  const store = new BattlefieldStore(createInitialBattlefieldState(12));
  const observed = [];
  store.subscribe(state => observed.push(state));

  store.dispatch({ type: 'SET_TIME', currentTime: 25 });
  store.dispatch({ type: 'SET_MODE', mode: 'BATTLEFIELD' });
  store.dispatch({ type: 'SET_ACTIVE_EVENTS', eventIds: ['E-1', 'E-1', 'E-2'] });
  store.dispatch({ type: 'SET_VISIBLE_UNITS', unitIds: ['U-1', 'U-1'] });
  store.dispatch({ type: 'SELECT_POI', poiId: 'POI-1' });

  assert.equal(store.getState().currentTime, 25);
  assert.equal(store.getState().mode, 'BATTLEFIELD');
  assert.deepEqual(store.getState().activeEvents, ['E-1', 'E-2']);
  assert.deepEqual(store.getState().visibleUnits, ['U-1']);
  assert.equal(store.getState().selectedPOI, 'POI-1');
  assert.equal(observed.length, 5);
});

test('CameraDirector delegates commands without importing renderer details', () => {
  const calls = [];
  const port = {
    execute: command => calls.push(['execute', command]),
    cancel: () => calls.push(['cancel']),
    resume: () => calls.push(['resume']),
  };
  const director = new CameraDirector(port);
  const target = [118.3, 24.46];

  director.flyTo({ type: 'fly-to', presetId: 'guningtou', target, durationMs: 300 });
  assert.equal(director.getSnapshot().status, 'playing');
  assert.equal(director.getState().mode, 'fly-to');
  director.pause();
  assert.equal(director.getSnapshot().status, 'paused');
  director.resume();
  director.interrupt({ type: 'free-explore' });
  director.cancel();

  assert.deepEqual(calls.map(call => call[0]), ['execute', 'resume', 'cancel', 'execute', 'cancel']);
  assert.equal(director.getSnapshot().status, 'idle');
});

test('evidence adapter preserves uncertainty instead of upgrading confidence', () => {
  assert.equal(confidenceToEvidenceLevel('confirmed'), 'VERIFIED');
  assert.equal(confidenceToEvidenceLevel('probable'), 'SUPPORTED');
  assert.equal(confidenceToEvidenceLevel('estimated'), 'PARTIAL');
  assert.equal(confidenceToEvidenceLevel('disputed'), 'DISPUTED');
  assert.equal(confidenceToEvidenceLevel('unknown'), 'NO_EVIDENCE');
});

test('battle package adapter preserves provenance and keeps an unreviewed route research-only', () => {
  const adapted = adaptBattlePackage({
    locations: [{
      geometry: { type: 'Point', coordinates: [118.3, 24.46] },
      properties: {
        id: 'ADAPTER-POI',
        historicalName: { en: 'Adapter POI' },
        locationType: 'unknown',
        sourceRefs: ['ADAPTER-SOURCE'],
        confidence: 'probable',
        verificationStatus: 'pending-manual-verification',
        coordinateProvenance: {
          coordinateSystem: 'EPSG:4326',
          coordinateMethod: 'manual-correction',
          coordinatePrecision: 'approximate',
          verificationStatus: 'pending-manual-verification',
          sourceRefs: ['ADAPTER-SOURCE'],
          confidence: 'probable',
        },
      },
    }],
    events: [],
    units: [],
    routes: [{
      geometry: { type: 'LineString', coordinates: [[118.3, 24.46], [118.31, 24.47]] },
      properties: {
        id: 'ADAPTER-ROUTE',
        verificationStatus: 'candidate',
        status: 'review',
        confidence: 'probable',
        routeType: 'advance',
        nature: 'reconstructed',
        geometryProvenance: {
          coordinateSystem: 'EPSG:4326',
          temporalContext: 'reconstructed',
          coordinateMethod: 'manual-correction',
          coordinatePrecision: 'approximate',
          verificationStatus: 'candidate',
          sourceRefs: ['ADAPTER-SOURCE'],
          confidence: 'probable',
        },
        sourceRefs: ['ADAPTER-SOURCE'],
      },
    }],
    sources: [{
      id: 'ADAPTER-SOURCE',
      title: { en: 'Adapter source' },
      sourceType: 'test',
      sourceRefs: [],
      confidence: 'confirmed',
    }],
  });

  assert.equal(adapted.pois[0].confidence, 'SUPPORTED');
  assert.equal(adapted.pois[0].verificationStatus, 'pending-manual-verification');
  assert.equal(adapted.pois[0].provenance.coordinateMethod, 'manual-correction');
  assert.equal(adapted.routes[0].historicalRouteStatus, 'candidate');
  assert.equal(adapted.routes[0].researchOnly, true);
  assert.equal(adapted.routes[0].provenance.temporalContext, 'reconstructed');
  assert.equal(adapted.sources[0].confidence, 'VERIFIED');
});

test('BattlefieldEngine proves the vertical slice order without inventing historical data', () => {
  const calls = [];
  const engine = new BattlefieldEngine({
    data: NON_HISTORICAL_TEST_DATA,
    timeline: NON_HISTORICAL_TEST_DATA.timeline,
    cameraPort: {
      execute: command => calls.push(['execute', command]),
      cancel: () => calls.push(['cancel']),
      resume: () => calls.push(['resume']),
    },
  });

  engine.setMode('BATTLEFIELD');
  engine.seek(25);
  engine.selectPOI('TEST-POI-01');
  engine.flyTo({ type: 'fly-to', presetId: 'synthetic', target: [118.2, 24.2] });
  const slice = engine.getSnapshot();

  assert.equal(slice.state.mode, 'BATTLEFIELD');
  assert.equal(slice.state.currentTime, 25);
  assert.equal(slice.state.selectedPOI, 'TEST-POI-01');
  assert.deepEqual(slice.state.activeEvents, ['TEST-EVENT-ARRIVAL', 'TEST-EVENT-COUNTER']);
  assert.deepEqual(slice.state.visibleUnits, ['TEST-UNIT-ROC']);
  assert.deepEqual(engine.getNarration('TEST-STORY-01').narration, { en: 'Synthetic narration; not a historical claim.' });
  assert.equal(calls[0][0], 'execute');

  engine.setResearchMode(true);
  assert.deepEqual(engine.getSnapshot().state.visibleUnits, ['TEST-UNIT-ROC', 'TEST-UNIT-RESEARCH']);
  engine.interruptCamera({ type: 'free-explore' });
  engine.cancelCamera();
  assert.deepEqual(calls.map(call => call[0]), ['execute', 'cancel', 'execute', 'cancel']);
  engine.dispose();
});
