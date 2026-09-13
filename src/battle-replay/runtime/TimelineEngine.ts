import type { TimelineSnapshot } from './types.js';

export interface TimelineEngineOptions {
  startTime: number;
  endTime: number;
  initialTime?: number;
  speed?: number;
  now?: () => number;
  requestFrame?: (callback: (now: number) => void) => number;
  cancelFrame?: (handle: number) => void;
}

export type TimelineListener = (snapshot: TimelineSnapshot) => void;

function finite(value: number, name: string) {
  if (!Number.isFinite(value)) throw new Error(`${name} must be finite.`);
  return value;
}

function bounded(value: number, startTime: number, endTime: number) {
  return Math.max(startTime, Math.min(endTime, value));
}

function defaultNow() {
  return typeof globalThis.performance?.now === 'function' ? globalThis.performance.now() : Date.now();
}

function browserRequestFrame(callback: (now: number) => void) {
  return typeof globalThis.requestAnimationFrame === 'function' ? globalThis.requestAnimationFrame(callback) : 0;
}

function browserCancelFrame(handle: number) {
  if (typeof globalThis.cancelAnimationFrame === 'function' && handle !== 0) globalThis.cancelAnimationFrame(handle);
}

/** Deterministic timeline clock. It knows time, not Three.js or historical meaning. */
export class TimelineEngine {
  private readonly startTime: number;
  private readonly endTime: number;
  private readonly now: () => number;
  private readonly requestFrame: (callback: (now: number) => void) => number;
  private readonly cancelFrame: (handle: number) => void;
  private readonly listeners = new Set<TimelineListener>();
  private currentTime: number;
  private speed: number;
  private playing = false;
  private previousWallTime: number | null = null;
  private frameHandle: number | null = null;

  constructor(options: TimelineEngineOptions) {
    this.startTime = finite(options.startTime, 'Timeline startTime');
    this.endTime = finite(options.endTime, 'Timeline endTime');
    if (this.endTime < this.startTime) throw new Error('Timeline endTime must not be before startTime.');
    this.currentTime = bounded(options.initialTime ?? this.startTime, this.startTime, this.endTime);
    this.speed = options.speed ?? 1;
    finite(this.speed, 'Timeline speed');
    if (this.speed <= 0) throw new Error('Timeline speed must be greater than zero.');
    this.now = options.now ?? defaultNow;
    this.requestFrame = options.requestFrame ?? browserRequestFrame;
    this.cancelFrame = options.cancelFrame ?? browserCancelFrame;
  }

  play() {
    if (this.currentTime >= this.endTime) this.currentTime = this.startTime;
    if (this.playing) return this.getSnapshot();
    this.playing = true;
    this.previousWallTime = this.now();
    this.emit();
    this.schedule();
    return this.getSnapshot();
  }

  pause() {
    if (!this.playing) return this.getSnapshot();
    this.playing = false;
    this.previousWallTime = null;
    this.cancelScheduledFrame();
    this.emit();
    return this.getSnapshot();
  }

  seek(time: number) {
    this.currentTime = bounded(finite(time, 'Timeline seek time'), this.startTime, this.endTime);
    this.previousWallTime = this.playing ? this.now() : null;
    this.emit();
    return this.getSnapshot();
  }

  setSpeed(speed: number) {
    finite(speed, 'Timeline speed');
    if (speed <= 0) throw new Error('Timeline speed must be greater than zero.');
    this.speed = speed;
    this.emit();
    return this.getSnapshot();
  }

  getCurrentTime() {
    return this.currentTime;
  }

  getSnapshot(): TimelineSnapshot {
    return {
      currentTime: this.currentTime,
      startTime: this.startTime,
      endTime: this.endTime,
      speed: this.speed,
      playing: this.playing,
    };
  }

  /** Advances simulation time by an explicit wall-clock duration; intended for tests and hosts with their own frame loop. */
  advanceBy(elapsedMs: number) {
    finite(elapsedMs, 'Timeline elapsedMs');
    if (!this.playing || elapsedMs <= 0) return this.getSnapshot();
    this.currentTime = Math.min(this.endTime, this.currentTime + elapsedMs * this.speed);
    this.emit();
    if (this.currentTime >= this.endTime) this.pause();
    return this.getSnapshot();
  }

  subscribe(listener: TimelineListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  dispose() {
    this.pause();
    this.listeners.clear();
  }

  private schedule() {
    if (!this.playing || this.frameHandle !== null) return;
    const handle = this.requestFrame(now => {
      this.frameHandle = null;
      if (!this.playing) return;
      const previous = this.previousWallTime ?? now;
      this.previousWallTime = now;
      this.currentTime = Math.min(this.endTime, this.currentTime + Math.max(0, now - previous) * this.speed);
      this.emit();
      if (this.currentTime >= this.endTime) {
        this.pause();
        return;
      }
      this.schedule();
    });
    this.frameHandle = handle === 0 ? null : handle;
  }

  private cancelScheduledFrame() {
    if (this.frameHandle === null) return;
    this.cancelFrame(this.frameHandle);
    this.frameHandle = null;
  }

  private emit() {
    const snapshot = this.getSnapshot();
    this.listeners.forEach(listener => listener(snapshot));
  }
}
