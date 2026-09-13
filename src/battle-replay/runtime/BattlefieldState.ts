import type { EntityId } from '../types/index.js';
import type { BattlefieldAction, BattlefieldState } from './types.js';

const DEFAULT_CAMERA: BattlefieldState['cameraState'] = {
  mode: 'free-explore',
  isAnimating: false,
};

export function createInitialBattlefieldState(currentTime = 0): BattlefieldState {
  if (!Number.isFinite(currentTime)) throw new Error('BattlefieldState currentTime must be finite.');
  return {
    currentTime,
    mode: 'EXPLORE',
    researchMode: false,
    activeEvents: [],
    visibleUnits: [],
    selectedPOI: null,
    selectedRegion: null,
    cameraState: { ...DEFAULT_CAMERA },
  };
}

function finiteTime(value: number) {
  if (!Number.isFinite(value)) throw new Error('BattlefieldState time must be finite.');
  return value;
}

function uniqueIds(ids: EntityId[]) {
  return [...new Set(ids)];
}

export function reduceBattlefieldState(state: BattlefieldState, action: BattlefieldAction): BattlefieldState {
  switch (action.type) {
    case 'SET_TIME':
      return { ...state, currentTime: finiteTime(action.currentTime) };
    case 'SET_MODE':
      return { ...state, mode: action.mode };
    case 'SET_RESEARCH_MODE':
      return { ...state, researchMode: action.researchMode };
    case 'SET_ACTIVE_EVENTS':
      return { ...state, activeEvents: uniqueIds(action.eventIds) };
    case 'SET_VISIBLE_UNITS':
      return { ...state, visibleUnits: uniqueIds(action.unitIds) };
    case 'SELECT_POI':
      return { ...state, selectedPOI: action.poiId };
    case 'SELECT_REGION':
      return { ...state, selectedRegion: action.regionId };
    case 'SET_CAMERA':
      return { ...state, cameraState: { ...action.cameraState } };
    case 'RESET':
      return createInitialBattlefieldState(action.currentTime ?? 0);
  }
}

export type BattlefieldStateListener = (state: BattlefieldState) => void;

/** Small external-store compatible state container for React or other UI hosts. */
export class BattlefieldStore {
  private state: BattlefieldState;
  private readonly listeners = new Set<BattlefieldStateListener>();

  constructor(initialState = createInitialBattlefieldState()) {
    this.state = {
      ...initialState,
      researchMode: initialState.researchMode,
      activeEvents: [...initialState.activeEvents],
      visibleUnits: [...initialState.visibleUnits],
      cameraState: { ...initialState.cameraState },
    };
  }

  getState() {
    return this.state;
  }

  dispatch(action: BattlefieldAction) {
    const next = reduceBattlefieldState(this.state, action);
    if (next === this.state) return this.state;
    this.state = next;
    this.listeners.forEach(listener => listener(this.state));
    return this.state;
  }

  subscribe(listener: BattlefieldStateListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
