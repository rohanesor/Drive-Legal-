import { AgentContext, AgentResult, AgentIntent } from '../orchestrator/types';
import { ToolRegistry } from '../orchestrator/ToolRegistry';

export class RouteAgent {
  /**
   * Processes routing queries comparing safety factors and route tradeoffs.
   * Invokes deterministic P0.2 routing services.
   */
  static async processQuery(request: string, context: AgentContext, intent: AgentIntent): Promise<AgentResult> {
    try {
      const currentRouteTool = ToolRegistry.getTool('get_current_route');
      const safeRouteTool = ToolRegistry.getTool('calculate_safe_route');
      const alternativesTool = ToolRegistry.getTool('get_route_alternatives');

      if (!currentRouteTool || !safeRouteTool || !alternativesTool) {
        throw new Error('Routing tools are unavailable.');
      }

      const routeData = await currentRouteTool.execute({}, context);
      const safeData = await safeRouteTool.execute({}, context);
      const alternativesData = await alternativesTool.execute({}, context);

      const safetyScore = safeData.safetyScore;
      const diffMinutes = safeData.alternativeRouteDiffMinutes || 0;

      let answer = `The current route safety rating is ${safetyScore}%.`;
      if (safeData.saferRouteAvailable) {
        answer += ` A safer route alternative is available, which avoids restricted streets and adds approximately ${diffMinutes} minutes.`;
      }

      const requestedActions: string[] = [];
      if (safeData.saferRouteAvailable) {
        requestedActions.push('NAVIGATE_ALTERNATIVE_ROUTE');
      }

      return {
        answer,
        intent,
        sources: ['P0.2'],
        confidence: 0.95,
        recommendations: safeData.saferRouteAvailable 
          ? ['Consider switching to the safer alternative route.'] 
          : ['Maintain current navigation route.'],
        requestedActions,
      };
    } catch (e) {
      return {
        answer: 'DriveLegal routing tools are currently offline.',
        intent,
        sources: [],
        confidence: 0.5,
        recommendations: ['Follow local posted detour signs.'],
        requestedActions: [],
      };
    }
  }
}
export default RouteAgent;
