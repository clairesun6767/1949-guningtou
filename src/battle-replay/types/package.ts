import type { DataQualityStatus, EntityId, SchemaVersion } from './shared.js';

export interface BattlePackageManifest {
  schemaVersion: SchemaVersion;
  packageId: EntityId;
  battleId: EntityId;
  packageVersion: string;
  packageRole: 'calibration-overlay' | 'canonical' | 'generated-adapter-output';
  minimumEngineVersion: string;
  defaultLocale: string;
  supportedLocales: string[];
  generatedAt?: string;
  reviewStatus: DataQualityStatus;
  sourceCatalog: {
    adapter: 'legacy-battlefield-sources';
    path: string;
  };
  files: Record<string, string>;
  migrations: Array<{
    from: string;
    to: string;
    strategy: string;
  }>;
}

export interface GeospatialCalibrationPackage {
  groundControlPoints: import('./geospatial.js').GroundControlPointDataset;
  imagery: import('./geospatial.js').ImageryGeoreferencingMetadata[];
}
