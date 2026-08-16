import { AgentContext, AgentResult, AgentIntent } from '../orchestrator/types';
import { ToolRegistry } from '../orchestrator/ToolRegistry';

export class SafetyAgent {
  /**
   * Processes safety queries by retrieving dynamic risk signals and score impact variables.
   * Never calculates risk parameters independently.
   */
  static async processQuery(request: string, context: AgentContext, intent: AgentIntent): Promise<AgentResult> {
    try {
      const riskTool = ToolRegistry.getTool('get_current_risk');
      const scoreTool = ToolRegistry.getTool('get_drive_score');

      if (!riskTool || !scoreTool) {
        throw new Error('Safety tools are unavailable.');
      }

      const riskData = await riskTool.execute({}, context);
      const scoreData = await scoreTool.execute({}, context);

      const risk = riskData.score;
      const score = scoreData.score;
      const explanation = riskData.explanation || 'No dynamic driving risk factors detected.';

      let answer = `Your current safety risk score is ${risk}. ${explanation}`;
      if (score < 75) {
        answer += ` Your DriveScore is currently ${score} (Grade: ${scoreData.grade}) due to elevated driver risk levels.`;
      } else {
        answer += ` Your DriveScore is high at ${score} (Grade: ${scoreData.grade}), indicating safe driving patterns.`;
      }

      // Populate recommendations from raw signals
      const recommendations: string[] = [];
      if (riskData.signals && riskData.signals.length > 0) {
        riskData.signals.forEach((sig: { type: string }) => {
          if (sig.type === 'SPEEDING') {
            recommendations.push('Reduce speed to the posted limit immediately.');
          } else if (sig.type === 'HARSH_BRAKING') {
            recommendations.push('Maintain more vehicle following distance.');
          }
        });
      }

      if (recommendations.length === 0) {
        recommendations.push('Continue maintaining safe driving habits.');
      }

      return {
        answer,
        intent,
        sources: ['P0.3', 'P0.5'],
        confidence: scoreData.confidence,
        recommendations,
        requestedActions: [],
      };
    } catch (e) {
      return {
        answer: 'DriveLegal cannot verify safety risk telemetry at this time.',
        intent,
        sources: [],
        confidence: 0.5,
        recommendations: ['Check sensor connections and verify GPS signal status.'],
        requestedActions: [],
      };
    }
  }
}
export default SafetyAgent;
