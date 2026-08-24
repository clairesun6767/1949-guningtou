import type { CameraPreset, CameraPresetId } from './types.js';

export const CAMERA_PRESETS: Record<CameraPresetId, CameraPreset> = {
  strategic: {
    id: 'strategic', scale: 1, translateX: 0, translateY: 0,
    tiltDegrees: 36, durationMs: 1400, detailLevel: 'low', atmosphere: 'full',
  },
  kinmen: {
    id: 'kinmen', scale: 1.72, translateX: -18, translateY: 3,
    tiltDegrees: 34, durationMs: 1450, detailLevel: 'medium', atmosphere: 'reduced',
  },
  guningtou: {
    id: 'guningtou', scale: .8, translateX: -2, translateY: 10,
    tiltDegrees: 20, durationMs: 1550, detailLevel: 'high', atmosphere: 'reduced',
  },
  landing_coast: {
    id: 'landing_coast', scale: 1.02, translateX: -7, translateY: 8,
    tiltDegrees: 18, durationMs: 1150, detailLevel: 'high', atmosphere: 'minimal',
  },
  battle_overview: {
    id: 'battle_overview', scale: .8, translateX: -2, translateY: 10,
    tiltDegrees: 20, durationMs: 1100, detailLevel: 'high', atmosphere: 'reduced',
  },
  poi_focus: {
    id: 'poi_focus', scale: 1.12, translateX: -8, translateY: 8,
    tiltDegrees: 16, durationMs: 950, detailLevel: 'high', atmosphere: 'minimal',
  },
  story_mode: {
    id: 'story_mode', scale: .92, translateX: -4, translateY: 8,
    tiltDegrees: 18, durationMs: 1200, detailLevel: 'high', atmosphere: 'minimal',
  },
};

export function validateCameraPresets(
  presets: Record<CameraPresetId, CameraPreset> = CAMERA_PRESETS,
): string[] {
  const required: CameraPresetId[] = [
    'strategic', 'kinmen', 'guningtou', 'landing_coast',
    'battle_overview', 'poi_focus', 'story_mode',
  ];
  const errors: string[] = [];
  for (const id of required) {
    const preset = presets[id];
    if (!preset) {
      errors.push(`Missing camera preset: ${id}`);
      continue;
    }
    if (preset.id !== id) errors.push(`Camera preset key/id mismatch: ${id}`);
    if (!Number.isFinite(preset.scale) || preset.scale <= 0) errors.push(`Invalid scale: ${id}`);
    if (!Number.isFinite(preset.translateX) || !Number.isFinite(preset.translateY)) errors.push(`Invalid translation: ${id}`);
    if (!Number.isFinite(preset.tiltDegrees) || preset.tiltDegrees < 0 || preset.tiltDegrees > 60) errors.push(`Invalid tilt: ${id}`);
    if (!Number.isFinite(preset.durationMs) || preset.durationMs < 0) errors.push(`Invalid duration: ${id}`);
  }
  return errors;
}
