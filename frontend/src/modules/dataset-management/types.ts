export type DatasetType =
  | 'MAP'
  | 'LEGAL'
  | 'SPEED_LIMIT'
  | 'ROAD_RESTRICTION'
  | 'ZONE'
  | 'RISK_CONFIG'
  | 'NAVIGATION_CONFIG'
  | 'LANGUAGE'
  | 'VOICE'
  | 'APP_CONFIG';

export type DatasetState =
  | 'NOT_INSTALLED'
  | 'DOWNLOADING'
  | 'STAGED'
  | 'VALIDATING'
  | 'ACTIVE'
  | 'OUTDATED'
  | 'INVALID'
  | 'FAILED'
  | 'ROLLED_BACK';

export type TrustPolicy = 'TRUSTED' | 'UNTRUSTED' | 'REJECTED';

export interface DatasetManifest {
  datasetId: string;
  name: string;
  version: string;
  schemaVersion: string;
  createdAt: number;
  size: number;
  checksum: string;
  signature: string;
  region: string;
  dependencies: string[];
  minimumAppVersion: string;
  changes: string[];
}

export interface DatasetHealth {
  datasetId: string;
  version: string;
  integrity: boolean;
  compatibility: boolean;
  freshness: string;
  trust: TrustPolicy;
  status: DatasetState;
  lastValidated: number;
  errors: string[];
}

export interface DataHealthReport {
  maps: DatasetHealth | null;
  legal: DatasetHealth | null;
  risk: DatasetHealth | null;
  navigation: DatasetHealth | null;
  language: DatasetHealth | null;
  voice: DatasetHealth | null;
}
