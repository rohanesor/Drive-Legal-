import { DecisionRecord } from './types';

export class GoldenDecisionRegistry {
  private static goldenDecisions: Map<string, { decision: string; action: string }> = new Map();

  static registerGolden(scenarioId: string, expected: { decision: string; action: string }): void {
    this.goldenDecisions.set(scenarioId, expected);
  }

  static getGolden(scenarioId: string): { decision: string; action: string } | undefined {
    return this.goldenDecisions.get(scenarioId);
  }

  static evaluateRegression(scenarioId: string, record: DecisionRecord): boolean {
    const golden = this.getGolden(scenarioId);
    if (!golden) return true;
    return record.policyDecision.decision === golden.decision &&
           record.selectedAction.actionType === golden.action;
  }
}
export default GoldenDecisionRegistry;
