import { DecisionRecord } from './types';

export interface ExplanationResult {
  reason: string;
  evidence: string[];
  constraints: string[];
  decision: string;
  action: string;
  confidence: number;
  limitations: string[];
  userFacingExplanation: string;
}

export class WhyAPI {
  static explainDecision(record: DecisionRecord): ExplanationResult {
    const reason = record.policyDecision.reasonCodes.join(', ');
    const evidence = record.observations.map((o) => `${o.type} observation of ${o.value}`);
    const constraints = record.legalAssessment.applicableRules;
    const decision = record.policyDecision.decision;
    const action = record.selectedAction.actionType;
    const confidence = record.confidence.finalDecision;

    let explanation = `DriveLegal noticed ${reason.toLowerCase().replace(/_/g, ' ')}. `;
    if (constraints.length > 0) {
      explanation += `Under rules: ${constraints.join(', ')}. `;
    }
    explanation += `Action taken: ${action.toLowerCase().replace(/_/g, ' ')}.`;

    return {
      reason,
      evidence,
      constraints,
      decision,
      action,
      confidence,
      limitations: record.inputs.connectivity === 'offline' ? ['Offline Mode degradation active'] : [],
      userFacingExplanation: explanation,
    };
  }
}
export default WhyAPI;
