export type FailureCategory = 'TRANSIENT' | 'RECOVERABLE' | 'DEGRADED' | 'CRITICAL' | 'PERMANENT' | 'UNKNOWN';

export type FailureDomain =
  | 'GPS'
  | 'NETWORK'
  | 'STORAGE'
  | 'MEMORY'
  | 'DATASETS'
  | 'LEGAL'
  | 'RISK'
  | 'NAVIGATION'
  | 'VOICE'
  | 'DRIVER'
  | 'POLICY'
  | 'SECURITY';

export interface Checkpoint {
  checkpointId: string;
  schemaVersion: string;
  createdAt: number;
  runtimeVersion: string;
  stateVersion: string;
  checksum: string;
  data: any;
}

export type DegradationLevel = 'FULL' | 'REDUCED' | 'DEGRADED' | 'MINIMAL' | 'UNAVAILABLE';

export type GPSState = 'GPS_AVAILABLE' | 'GPS_DEGRADED' | 'GPS_UNAVAILABLE';

export type GPSStaleness = 'FRESH' | 'AGING' | 'STALE' | 'UNKNOWN';

export type ReliabilityHealth = 'HEALTHY' | 'DEGRADED' | 'UNSTABLE' | 'RECOVERING' | 'FAILED';

export interface ReliabilityMetrics {
  crashRecoveryTime: number;
  engineRestartCount: number;
  failedTransactions: number;
  checkpointFailures: number;
  storageFailures: number;
}
