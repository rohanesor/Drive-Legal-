import { AgentContext, AgentResult, AgentIntent } from '../orchestrator/types';
import { ToolRegistry } from '../orchestrator/ToolRegistry';

export class DriverAgent {
  static async processQuery(request: string, context: AgentContext, intent: AgentIntent): Promise<AgentResult> {
    try {
      const tool = ToolRegistry.getTool('get_current_context');
      if (!tool) {
        throw new Error('Driver context tool is unavailable.');
      }
      const data = await tool.execute({}, context);
      const state = data.drivingState || 'PARKED';
      const prefText = data.preferences && data.preferences.preferSaferRoutes ? 'safer route preference' : 'standard route preference';
      return {
        answer: `Driving status is currently ${state}. Current route preference settings: ${prefText}.`,
        intent,
        sources: ['P1.7'],
        confidence: 0.9,
        recommendations: [],
        requestedActions: [],
      };
    } catch (e) {
      return {
        answer: 'Driver context is currently unavailable.',
        intent,
        sources: [],
        confidence: 0.5,
        recommendations: [],
        requestedActions: [],
      };
    }
  }
}
export default DriverAgent;
