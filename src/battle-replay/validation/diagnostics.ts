import type { DataQualityStatus } from '../types/shared.js';

export type DiagnosticSeverity = 'ERROR' | 'WARNING' | 'INFO';
export type ValidationDomain = 'technical' | 'historical' | 'integrity' | 'schema';

export interface ValidationDiagnostic {
  severity: DiagnosticSeverity;
  domain: ValidationDomain;
  code: string;
  message: string;
  path?: string;
  entityId?: string;
}

export interface ValidationReport {
  valid: boolean;
  qualityStatus: DataQualityStatus;
  errors: number;
  warnings: number;
  info: number;
  diagnostics: ValidationDiagnostic[];
  unresolvedEntityIds: string[];
  unverifiedCoordinateIds: string[];
  routeStatus: Record<string, number>;
}

export class DiagnosticCollector {
  readonly diagnostics: ValidationDiagnostic[] = [];

  add(diagnostic: ValidationDiagnostic): void {
    this.diagnostics.push(diagnostic);
  }

  error(code: string, message: string, options: Partial<ValidationDiagnostic> = {}): void {
    this.add({ severity: 'ERROR', domain: 'technical', code, message, ...options });
  }

  warning(code: string, message: string, options: Partial<ValidationDiagnostic> = {}): void {
    this.add({ severity: 'WARNING', domain: 'historical', code, message, ...options });
  }

  info(code: string, message: string, options: Partial<ValidationDiagnostic> = {}): void {
    this.add({ severity: 'INFO', domain: 'historical', code, message, ...options });
  }
}
