export type AgentIntent = 
  | 'SAFETY_QUERY' 
  | 'LEGAL_QUERY' 
  | 'ROUTE_QUERY' 
  | 'SCORE_QUERY' 
  | 'CURRENT_STATUS' 
  | 'NAVIGATION_REQUEST' 
  | 'GENERAL_QUERY' 
  | 'EMERGENCY'
  | 'USER_REQUEST'
  | 'SYSTEM_EVENT'
  | 'SAFETY_EVENT'
  | 'NAVIGATION_EVENT'
  | 'VEHICLE_EVENT'
  | 'LEGAL_EVENT'
  | 'ALERT_EVENT';

export type AgentType = 
  | 'SafetyAgent' 
  | 'LegalAgent' 
  | 'RouteAgent'
  | 'VehicleAgent'
  | 'DriverAgent'
  | 'ScoreAgent';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: any;
  outputSchema: any;
  execute: (input: any, context: any) => Promise<any>;
  permissions: string[];
}

export interface AgentResult {
  answer: string;
  intent: AgentIntent;
  sources: string[];
  confidence: number;
  recommendations: string[];
  requestedActions: string[];
}

export interface RealTimeContext {
  speed: number;
  heading: number;
  latitude: number;
  longitude: number;
  vehicleType: 'car' | 'motorcycle' | 'heavy';
  isEmergencyVehicle?: boolean;
}

export interface TripContext {
  routeId?: string;
  destinationName?: string;
  tripScore?: number;
}

export interface SystemContext {
  country: string;
  state: string;
  city?: string;
}

export interface AgentContext {
  realTime: RealTimeContext;
  trip: TripContext;
  system: SystemContext;
  preferences: {
    voiceEnabled: boolean;
    alertFrequency: 'high' | 'medium' | 'low';
    navigationAlerts: boolean;
    legalAlerts: boolean;
    safetyAlerts: boolean;
  };
}

export interface AgentPlanStep {
  id: string;
  agent: AgentType;
  objective: string;
  input: any;
  dependencies: string[];
  tools: string[];
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'BLOCKED';
  output?: any;
}

export interface AgentPlan {
  id: string;
  objective: string;
  steps: AgentPlanStep[];
  requiredContext: string[];
  agents: AgentType[];
  tools: string[];
  constraints: string[];
  createdAt: number;
}

export interface Evidence {
  source: string;
  value: any;
  timestamp: number;
  confidence: number;
}

export interface Decision {
  id: string;
  objective: string;
  recommendation: string;
  actions: string[];
  evidence: Evidence[];
  constraints: string[];
  confidence: number;
  authority: 'INFORMATIONAL' | 'RECOMMENDATION' | 'ACTION_REQUEST' | 'CRITICAL';
  status: string;
}

export interface DecisionExplanation {
  summary: string;
  reasons: string[];
  evidence: Evidence[];
  alternatives: string[];
}

export interface DecisionTrace {
  requestId: string;
  planId?: string;
  context: any;
  plan?: AgentPlan;
  stepsExecuted: any[];
  decisions: Decision[];
  finalAction?: string;
}

