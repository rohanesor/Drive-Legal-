import { ToolDefinition } from './types';
import { LegalComplianceEngine } from '../../legal/LegalComplianceEngine';
import { DriveScoreEngine } from '../../drive-score/DriveScoreEngine';
import { RiskEngine } from '../../risk/RiskEngine';
import { AssistantEngine } from '../../assistant/AssistantEngine';
import { PerceptionEngine } from '../../perception/PerceptionEngine';

// Singletons for execution
const legalEngine = new LegalComplianceEngine();
const scoreEngine = new DriveScoreEngine();
const riskEngine = new RiskEngine();
const assistantEngine = new AssistantEngine();
export const perceptionEngine = new PerceptionEngine();

export class ToolRegistry {
  private static tools: Map<string, ToolDefinition> = new Map();

  static registerTool(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  static getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  static getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }
}

// Register default tools
ToolRegistry.registerTool({
  name: 'get_current_risk',
  description: 'Retrieves the current dynamic driver risk score and risk explanation factors.',
  inputSchema: {},
  outputSchema: { score: 'number', signals: 'array' },
  permissions: ['telemetry:read'],
  execute: async (input, context) => {
    // Invoke deterministic risk engine
    const res = riskEngine.evaluate({
      vehicleState: {
        currentSpeed: context.realTime.speed,
        acceleration: 0,
        brakingIntensity: 0,
        heading: context.realTime.heading,
        vehicleType: context.realTime.vehicleType,
      },
      roadContext: {
        currentSpeedLimit: 50,
        roadClassification: 'urban' as const,
        isNearIntersection: false,
        isSchoolZone: false,
        isPedestrianHeavy: false,
        isSharpCurve: false,
        isRestrictedRoad: false,
      },
      driverBehavior: {
        repeatedSpeedingCount: 0,
        harshBrakingCount: 0,
        rapidAccelerationCount: 0,
        headingChangeRate: 0,
        unsafePatternPersistenceScore: 0,
      }
    });
    return {
      score: res.score,
      signals: res.signals,
      explanation: res.recommendations.join(' '), // recommendations contain explanation text
    };
  },
});

ToolRegistry.registerTool({
  name: 'get_drive_score',
  description: 'Retrieves the aggregated current DriveScore and components status.',
  inputSchema: {},
  outputSchema: { score: 'number', grade: 'string', components: 'array' },
  permissions: ['score:read'],
  execute: async (input, context) => {
    // Invoke score engine
    const riskRes = riskEngine.evaluate({
      vehicleState: {
        currentSpeed: context.realTime.speed,
        acceleration: 0,
        brakingIntensity: 0,
        heading: context.realTime.heading,
        vehicleType: context.realTime.vehicleType,
      },
      roadContext: {
        currentSpeedLimit: 50,
        roadClassification: 'urban' as const,
        isNearIntersection: false,
        isSchoolZone: false,
        isPedestrianHeavy: false,
        isSharpCurve: false,
        isRestrictedRoad: false,
      },
      driverBehavior: {
        repeatedSpeedingCount: 0,
        harshBrakingCount: 0,
        rapidAccelerationCount: 0,
        headingChangeRate: 0,
        unsafePatternPersistenceScore: 0,
      }
    });
    const res = scoreEngine.calculate({
      routeSafetyScore: context.trip.tripScore || 90,
      driverRiskResult: { score: riskRes.score, signals: riskRes.signals },
      legalComplianceResult: {
        overallStatus: 'COMPLIANT',
        violations: [],
        warnings: [],
      },
    });
    return {
      score: res.score,
      grade: res.grade,
      trend: res.trend,
      components: res.components,
      confidence: res.confidence,
    };
  },
});

ToolRegistry.registerTool({
  name: 'evaluate_legal_compliance',
  description: 'Evaluates the current speed, locations, and actions against traffic rules.',
  inputSchema: {},
  outputSchema: { overallStatus: 'string', violations: 'array', warnings: 'array' },
  permissions: ['legal:read'],
  execute: async (input, context) => {
    // Invoke legal engine
    const res = legalEngine.evaluate({
      jurisdiction: {
        country: context.system.country,
        state: context.system.state,
        city: context.system.city,
      },
      vehicleContext: {
        currentSpeed: context.realTime.speed,
        vehicleType: context.realTime.vehicleType,
        heading: context.realTime.heading,
        isEmergencyVehicle: context.realTime.isEmergencyVehicle,
      },
      roadContext: {
        applicableSpeedLimit: 50,
        roadType: 'urban',
        isNoEntry: false,
        isOneWay: false,
        isSchoolZone: false,
        isBusZone: false,
      },
      driverBehavior: {
        speedingPersistenceSeconds: 0,
        parkingStatus: 'moving',
      },
    });
    return {
      overallStatus: res.overallStatus,
      violations: res.violations,
      warnings: res.warnings,
      confidence: res.confidence,
    };
  },
});

ToolRegistry.registerTool({
  name: 'get_current_route',
  description: 'Retrieves current active navigation route and destination metrics.',
  inputSchema: {},
  outputSchema: { routeId: 'string', destination: 'string' },
  permissions: ['route:read'],
  execute: async (input, context) => {
    return {
      routeId: context.trip.routeId || 'route_default',
      destination: context.trip.destinationName || 'Coimbatore Center',
    };
  },
});

ToolRegistry.registerTool({
  name: 'calculate_safe_route',
  description: 'Calculates the optimal safe route avoiding high-risk zones and restricted roads.',
  inputSchema: {},
  outputSchema: { safetyScore: 'number', saferRouteAvailable: 'boolean' },
  permissions: ['route:write'],
  execute: async (input, context) => {
    return {
      safetyScore: 92,
      saferRouteAvailable: true,
      alternativeRouteDiffMinutes: 4,
    };
  },
});

ToolRegistry.registerTool({
  name: 'get_route_alternatives',
  description: 'Lists alternative routes with duration differences and safety score comparisons.',
  inputSchema: {},
  outputSchema: { alternatives: 'array' },
  permissions: ['route:read'],
  execute: async (input, context) => {
    return {
      alternatives: [
        { name: 'Avinashi Rd Route', safetyScore: 92, durationDiffMinutes: 4 },
        { name: 'Sathy Rd Route', safetyScore: 70, durationDiffMinutes: 0 },
      ],
    };
  },
});

ToolRegistry.registerTool({
  name: 'get_active_alerts',
  description: 'Retrieves active safety warnings and legal compliance notices.',
  inputSchema: {},
  outputSchema: { alerts: 'array' },
  permissions: ['alerts:read'],
  execute: async (input, context) => {
    // Generate context for assistant
    const decision = assistantEngine.process({
      timestamp: Date.now(),
      vehicleState: {
        currentSpeed: context.realTime.speed,
        heading: context.realTime.heading,
        vehicleType: context.realTime.vehicleType,
        isEmergencyVehicle: context.realTime.isEmergencyVehicle,
      },
      location: {
        latitude: context.realTime.latitude,
        longitude: context.realTime.longitude,
      },
    });
    return {
      activeAlerts: decision.alert ? [decision.alert] : [],
    };
  },
});

ToolRegistry.registerTool({
  name: 'get_vehicle_context',
  description: 'Gets details on vehicle weight, type and category classifications.',
  inputSchema: {},
  outputSchema: { vehicleType: 'string', isEmergencyVehicle: 'boolean' },
  permissions: ['vehicle:read'],
  execute: async (input, context) => {
    return {
      vehicleType: context.realTime.vehicleType,
      isEmergencyVehicle: !!context.realTime.isEmergencyVehicle,
    };
  },
});

ToolRegistry.registerTool({
  name: 'get_recent_observations',
  description: 'Retrieves active confirmed sensor observations from the multimodal perception layer.',
  inputSchema: {},
  outputSchema: { observations: 'array' },
  permissions: ['perception:read'],
  execute: async (input, context) => {
    return {
      observations: perceptionEngine.getActiveObservations(),
    };
  },
});

ToolRegistry.registerTool({
  name: 'get_current_context',
  description: 'Retrieves current personalized driver context settings.',
  inputSchema: {},
  outputSchema: { drivingState: 'string', preferences: 'object' },
  permissions: ['context:read'],
  execute: async (input, context) => {
    return {
      drivingState: context.realTime.speed > 0 ? 'DRIVING' : 'PARKED',
      preferences: {
        preferSaferRoutes: true,
      },
    };
  },
});

ToolRegistry.registerTool({
  name: 'get_vehicle_status',
  description: 'Retrieves current vehicle system capability metrics.',
  inputSchema: {},
  outputSchema: { vehicleType: 'string', battery: 'number' },
  permissions: ['vehicle:read'],
  execute: async (input, context) => {
    return {
      vehicleType: context.realTime.vehicleType,
      battery: 100,
    };
  },
});

export default ToolRegistry;
