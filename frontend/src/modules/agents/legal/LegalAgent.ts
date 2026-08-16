import { AgentContext, AgentResult, AgentIntent } from '../orchestrator/types';
import { ToolRegistry } from '../orchestrator/ToolRegistry';

export class LegalAgent {
  /**
   * Processes legal queries by retrieving resolved rule sets.
   * Never fabricates rules; reports inability to verify if data is unavailable.
   */
  static async processQuery(request: string, context: AgentContext, intent: AgentIntent): Promise<AgentResult> {
    try {
      const legalTool = ToolRegistry.getTool('evaluate_legal_compliance');
      if (!legalTool) {
        throw new Error('Legal compliance tool is unavailable.');
      }

      const legalData = await legalTool.execute({}, context);
      const status = legalData.overallStatus;
      const violations = legalData.violations || [];
      const warnings = legalData.warnings || [];

      let answer = `Current legal compliance status is ${status}.`;

      if (violations.length > 0) {
        answer += ` ${violations[0].explanation}`;
      } else if (warnings.length > 0) {
        answer += ` Attention required: ${warnings[0].evidence}`;
      } else if (status === 'UNKNOWN') {
        return {
          answer: 'DriveLegal cannot verify the applicable rule for this location.',
          intent,
          sources: [],
          confidence: 0.4,
          recommendations: ['Watch local signs and continue driving cautiously.'],
          requestedActions: [],
        };
      } else {
        answer += ' Driving behavior is currently compliant with local rules.';
      }

      const recommendations: string[] = [];
      violations.forEach((v: { explanation: string }) => {
        recommendations.push(v.explanation);
      });

      if (recommendations.length === 0) {
        recommendations.push('Maintain compliance with the posted speed limits.');
      }

      return {
        answer,
        intent,
        sources: ['P0.4'],
        confidence: legalData.confidence ?? 0.9,
        recommendations,
        requestedActions: [],
      };
    } catch (e) {
      return {
        answer: 'DriveLegal cannot verify the applicable rule for this location.',
        intent,
        sources: [],
        confidence: 0.5,
        recommendations: ['Check rule database sync status.'],
        requestedActions: [],
      };
    }
  }
}
export default LegalAgent;
