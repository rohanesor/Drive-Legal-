import { DecisionRecord } from './types';

export class DecisionGraphEngine {
  static getDecisionTrace(record: DecisionRecord): string[] {
    const trace: string[] = [];
    trace.push(`Trigger: ${record.triggeringEventId}`);
    record.observations.forEach((o) => {
      trace.push(`Observation: ${o.type} from ${o.source}`);
    });
    trace.push(`Risk Level: ${record.riskAssessment.riskLevel}`);
    trace.push(`Legal Restrictions: ${record.legalAssessment.applicableRules.join(', ')}`);
    trace.push(`Context Version: ${record.contextSnapshot.contextVersion}`);
    if (record.agentProposal) {
      trace.push(`Agent Proposal: ${record.agentProposal.intent} -> ${record.agentProposal.action}`);
    }
    trace.push(`Policy Verdict: ${record.policyDecision.decision}`);
    trace.push(`Executed Action: ${record.selectedAction.actionType}`);
    trace.push(`Outcome: ${record.outcome.status} (${record.outcome.observedEffect})`);
    return trace;
  }
}
export default DecisionGraphEngine;
