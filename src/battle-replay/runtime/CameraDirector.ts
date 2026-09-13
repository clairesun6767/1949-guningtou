import type { CameraCommand, CameraState } from './types.js';

export interface CameraDirectorPort {
  execute(command: CameraCommand): void;
  cancel(): void;
  resume(): void;
}

export type CameraDirectorStatus = 'idle' | 'playing' | 'paused';
export interface CameraDirectorSnapshot {
  status: CameraDirectorStatus;
  command: CameraCommand | null;
}

export type CameraDirectorListener = (snapshot: CameraDirectorSnapshot) => void;

/** Renderer-neutral camera orchestration. Three.js is connected through CameraDirectorPort. */
export class CameraDirector {
  private status: CameraDirectorStatus = 'idle';
  private command: CameraCommand | null = null;
  private readonly listeners = new Set<CameraDirectorListener>();

  constructor(private readonly port: CameraDirectorPort) {}

  orbit(command: Extract<CameraCommand, { type: 'orbit' }>) {
    return this.play(command);
  }

  flyTo(command: Extract<CameraCommand, { type: 'fly-to' }>) {
    return this.play(command);
  }

  follow(command: Extract<CameraCommand, { type: 'follow' }>) {
    return this.play(command);
  }

  lookAt(command: Extract<CameraCommand, { type: 'look-at' }>) {
    return this.play(command);
  }

  cinematicPath(command: Extract<CameraCommand, { type: 'cinematic-path' }>) {
    return this.play(command);
  }

  freeExplore() {
    return this.play({ type: 'free-explore' });
  }

  play(command: CameraCommand) {
    this.port.execute(command);
    this.command = command;
    this.status = 'playing';
    this.emit();
    return this.getSnapshot();
  }

  interrupt(command: CameraCommand) {
    this.port.cancel();
    return this.play(command);
  }

  resume() {
    if (!this.command) return this.getSnapshot();
    this.port.resume();
    this.status = 'playing';
    this.emit();
    return this.getSnapshot();
  }

  cancel() {
    this.port.cancel();
    this.command = null;
    this.status = 'idle';
    this.emit();
    return this.getSnapshot();
  }

  pause() {
    if (this.status !== 'playing') return this.getSnapshot();
    this.status = 'paused';
    this.emit();
    return this.getSnapshot();
  }

  getSnapshot(): CameraDirectorSnapshot {
    return { status: this.status, command: this.command };
  }

  getState(): CameraState {
    const command = this.command;
    if (!command) return { mode: 'free-explore', isAnimating: false };
    switch (command.type) {
      case 'orbit': return { mode: 'orbit', presetId: command.presetId, target: command.target, isAnimating: this.status === 'playing' };
      case 'fly-to': return { mode: 'fly-to', presetId: command.presetId, target: command.target, isAnimating: this.status === 'playing' };
      case 'follow': return { mode: 'follow', unitId: command.unitId, isAnimating: this.status === 'playing' };
      case 'look-at': return { mode: 'look-at', target: command.target, isAnimating: this.status === 'playing' };
      case 'cinematic-path': return { mode: 'cinematic-path', target: command.points.at(-1), isAnimating: this.status === 'playing' };
      case 'free-explore': return { mode: 'free-explore', isAnimating: false };
    }
  }

  subscribe(listener: CameraDirectorListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    const snapshot = this.getSnapshot();
    this.listeners.forEach(listener => listener(snapshot));
  }
}

