export interface ScenarioAssertion {
  id: string;
  type: 'state' | 'event' | 'absence' | 'count' | 'timing';
  target?: string;
  expected?: any;
  timeoutMs?: number;
}

export interface ScenarioStep {
  id: string;
  at: number; // virtual time in seconds
  event: string;
  payload: any;
  expectedState?: {
    trip?: string;
    motion?: string;
    safety?: string;
    navigation?: string;
  };
  expectedEvents?: string[];
  assertions?: ScenarioAssertion[];
  duration?: number;
}

export interface ScenarioDefinition {
  id: string;
  name: string;
  version: string;
  metadata: {
    category: string;
    description: string;
  };
  initialState: {
    trip: string;
    motion: string;
  };
  steps: ScenarioStep[];
  seed?: number;
  variables?: Record<string, any>;
}

export interface ScenarioContext {
  scenarioId: string;
  scenarioVersion: string;
  runId: string;
  virtualTime: number;
  seed: number;
  currentStepIndex: number;
  variables: Record<string, any>;
  observedEvents: any[];
}

export interface ScenarioReport {
  scenarioId: string;
  runId: string;
  status: 'COMPLETED' | 'FAILED' | 'CANCELLED';
  startedAt: number;
  completedAt: number;
  duration: number;
  stepsExecuted: number;
  eventsGenerated: number;
  eventsObserved: number;
  assertionsPassed: number;
  assertionsFailed: number;
  faultsInjected: string[];
  finalState: any;
  errors: string[];
  performance: {
    durationMs: number;
    memoryUsageBytes?: number;
  };
}

export type ReplayState =
  | 'IDLE'
  | 'LOADING'
  | 'READY'
  | 'PLAYING'
  | 'PAUSED'
  | 'SEEKING'
  | 'COMPLETED'
  | 'FAILED';

export interface FaultDefinition {
  type:
    | 'GPS_FAILURE'
    | 'CAMERA_FAILURE'
    | 'VEHICLE_DISCONNECT'
    | 'NETWORK_FAILURE'
    | 'DATABASE_FAILURE'
    | 'LLM_FAILURE'
    | 'NAVIGATION_FAILURE'
    | 'RISK_ENGINE_FAILURE'
    | 'LEGAL_ENGINE_FAILURE'
    | 'VOICE_FAILURE'
    | 'EVENT_DUPLICATION'
    | 'EVENT_REORDERING'
    | 'EVENT_DELAY'
    | 'STALE_EVENT';
  startAt: number; // virtual time in seconds
  duration: number; // in seconds
}
