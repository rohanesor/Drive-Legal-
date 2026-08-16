export type SecurityState = 'SECURE' | 'DEGRADED' | 'WARNING' | 'COMPROMISED' | 'UNKNOWN';

export type TrustStatus = 'TRUSTED' | 'UNKNOWN' | 'REVOKED' | 'INVALID';

export interface SecurityEvent {
  eventId: string;
  type:
    | 'INTEGRITY_FAILURE'
    | 'SIGNATURE_FAILURE'
    | 'TRUST_FAILURE'
    | 'VERSION_ROLLBACK_ATTEMPT'
    | 'CONFIGURATION_TAMPERING'
    | 'DATASET_TAMPERING'
    | 'INVALID_PACKAGE'
    | 'KEY_FAILURE'
    | 'SECURE_STORAGE_FAILURE'
    | 'AUDIT_CHAIN_FAILURE';
  severity: 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL';
  timestamp: number;
  metadata: any;
}

export interface SecurityHealth {
  secureStorage: boolean;
  datasetIntegrity: boolean;
  configurationIntegrity: boolean;
  auditIntegrity: boolean;
  trustRegistry: boolean;
  keyStatus: boolean;
  overallStatus: SecurityState;
}

export interface AuditRecord {
  index: number;
  timestamp: number;
  eventData: any;
  hash: string;
}

export interface SafetyBounds {
  minWarningDistanceMeters: number;
  maxAlertCooldownSeconds: number;
  maxRouteDeviationThresholdMeters: number;
}
