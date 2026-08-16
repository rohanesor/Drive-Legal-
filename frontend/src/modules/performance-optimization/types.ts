export interface PerformanceMetric {
  component: string;
  operation: string;
  duration: number;
  timestamp: number;
  correlationId: string;
}

export interface PerformanceHealth {
  startup: number;
  memory: number;
  cpu: number;
  storage: number;
  latency: number;
  queues: number;
  cache: number;
  battery: number;
  overall: 'HEALTHY' | 'DEGRADED' | 'FAILED';
}

export interface PerformanceConfig {
  memoryLimitMb: number;
  queueLimit: number;
  cacheLimit: number;
  samplingThresholdMeters: number;
}

export interface ContextDelta {
  locationChanged: boolean;
  speedChanged: boolean;
  roadChanged: boolean;
  routeChanged: boolean;
}
