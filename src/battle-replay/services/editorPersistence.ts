const STORAGE_PREFIX = 'battlefield-coordinate-editor';

export interface PersistedCalibrationDraft<L, R, G> {
  schemaVersion: '1.0.0';
  packageId: string;
  savedAt: string;
  locations: L;
  routes: R;
  groundControlPoints: G;
}

export function calibrationStorageKey(packageId: string): string {
  return `${STORAGE_PREFIX}:${packageId}:v1`;
}

export function serializeCalibrationDraft<L, R, G>(draft: PersistedCalibrationDraft<L, R, G>): string {
  return JSON.stringify(draft);
}

export function parseCalibrationDraft<L, R, G>(serialized: string, expectedPackageId: string): PersistedCalibrationDraft<L, R, G> {
  const parsed: unknown = JSON.parse(serialized);
  if (typeof parsed !== 'object' || parsed === null) throw new Error('Calibration draft must be an object.');
  const candidate = parsed as Partial<PersistedCalibrationDraft<L, R, G>>;
  if (candidate.schemaVersion !== '1.0.0' || candidate.packageId !== expectedPackageId) {
    throw new Error('Calibration draft schema or package ID does not match this editor.');
  }
  if (!candidate.locations || !candidate.routes || !candidate.groundControlPoints) {
    throw new Error('Calibration draft is missing required datasets.');
  }
  return candidate as PersistedCalibrationDraft<L, R, G>;
}
