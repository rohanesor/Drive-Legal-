export type Criticality = 'CRITICAL' | 'IMPORTANT' | 'OPTIONAL';
export type FreshnessState = 'CURRENT' | 'AGING' | 'STALE' | 'UNAVAILABLE';
export type DegradedMode = 'NORMAL' | 'LIMITED' | 'CRITICAL_DEGRADED';

export interface CapabilityDefinition {
  id: string;
  name: string;
  category: string;
  criticality: Criticality;
  offlineSupport: boolean;
  fallback?: string;
  dependencies: string[];
}

export interface LocalModel {
  id: string;
  version: string;
  task: string;
  framework: string;
  requirements: {
    minimumMemoryMb: number;
  };
  load(): Promise<void>;
  unload(): Promise<void>;
  infer(input: any): Promise<any>;
}

export interface MapPackage {
  id: string;
  region: string;
  version: string;
  size: number;
  checksum: string;
}

export interface PolicyBundle {
  policyVersion: string;
  rules: string[];
  checksum: string;
}

export interface LegalDataset {
  jurisdiction: string;
  ruleId: string;
  ruleType: string;
  version: string;
}
