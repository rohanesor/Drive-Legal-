export interface ReleaseManifest {
  appVersion: string;
  engineVersions: Record<string, string>;
  datasetVersions: Record<string, string>;
  schemaVersion: string;
  configVersion: string;
  buildId: string;
}

export interface ProductionDatasetManifest {
  datasetId: string;
  version: string;
  schema: string;
  checksum: string;
  source: string;
  timestamp: number;
}

export interface ReleaseReadinessReport {
  build: 'PASS' | 'FAIL';
  tests: 'PASS' | 'FAIL';
  security: 'PASS' | 'FAIL';
  offline: 'PASS' | 'FAIL';
  performance: 'PASS' | 'FAIL';
  reliability: 'PASS' | 'FAIL';
  datasets: 'PASS' | 'FAIL';
  database: 'PASS' | 'FAIL';
  documentation: 'PASS' | 'FAIL';
  status: 'PASS' | 'FAIL';
}

export type ReleaseState = 'NOT_READY' | 'READY_FOR_RC' | 'RELEASE_CANDIDATE' | 'RELEASED' | 'ROLLED_BACK';
