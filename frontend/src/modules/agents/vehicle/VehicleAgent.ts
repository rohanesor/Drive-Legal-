import { AgentContext, AgentResult, AgentIntent } from '../orchestrator/types';
import { ToolRegistry } from '../orchestrator/ToolRegistry';

export class VehicleAgent {
  static async processQuery(request: string, context: AgentContext, intent: AgentIntent): Promise<AgentResult> {
    try {
      const tool = ToolRegistry.getTool('get_vehicle_context');
      if (!tool) {
        throw new Error('Vehicle status tool is unavailable.');
      }
      const data = await tool.execute({}, context);
      const fuelLevel = data.battery ?? data.fuel ?? 100;
      return {
        answer: `Vehicle status: ${data.vehicleType} category. Speed is ${context.realTime.speed} km/h. Fuel/Battery is at ${fuelLevel}%. Telemetry quality is ${context.realTime.speed > 0 ? 100 : 0}%.`,
        intent,
        sources: ['P1.3'],
        confidence: 1.0,
        recommendations: [],
        requestedActions: [],
      };
    } catch (e) {
      return {
        answer: 'Vehicle context data is currently unavailable.',
        intent,
        sources: [],
        confidence: 0.5,
        recommendations: ['Verify OBD-II or vehicle connection is active.'],
        requestedActions: [],
      };
    }
  }
}
export default VehicleAgent;
