import { AgentContext, AgentResult, AgentIntent } from '../orchestrator/types';
import { ToolRegistry } from '../orchestrator/ToolRegistry';

export class ScoreAgent {
  static async processQuery(request: string, context: AgentContext, intent: AgentIntent): Promise<AgentResult> {
    try {
      const tool = ToolRegistry.getTool('get_drive_score');
      if (!tool) {
        throw new Error('DriveScore tool is unavailable.');
      }
      const data = await tool.execute({}, context);
      return {
        answer: `Your current aggregated DriveScore is ${data.score} (Grade: ${data.grade}, Trend: ${data.trend}).`,
        intent,
        sources: ['P0.5'],
        confidence: 0.95,
        recommendations: [],
        requestedActions: [],
      };
    } catch (e) {
      return {
        answer: 'DriveScore details are currently unavailable.',
        intent,
        sources: [],
        confidence: 0.5,
        recommendations: [],
        requestedActions: [],
      };
    }
  }
}
export default ScoreAgent;
