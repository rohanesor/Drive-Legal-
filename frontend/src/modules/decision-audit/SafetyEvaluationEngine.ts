import { SafetyEvaluationReport } from './types';
import { ScenarioReport } from '../scenario-engine/types';

export class SafetyEvaluationEngine {
  static evaluateReport(
    scenarioReport: ScenarioReport,
    timingViolationsCount: number,
    alertsEvaluatedCount: number
  ): SafetyEvaluationReport {
    const safetyScore = scenarioReport.status === 'COMPLETED' ? 100 : 70;
    const legalScore = scenarioReport.status === 'COMPLETED' ? 100 : 80;
    const reliabilityScore = scenarioReport.status === 'COMPLETED' ? 100 : 90;
    const latencyScore = timingViolationsCount === 0 ? 100 : 60;

    const criticalFailures: string[] = [];
    if (scenarioReport.status === 'FAILED') {
      criticalFailures.push('Scenario assertions failed.');
    }
    if (timingViolationsCount > 0) {
      criticalFailures.push('Safety latency budget exceeded.');
    }

    return {
      scenarioId: scenarioReport.scenarioId,
      runId: scenarioReport.runId,
      safetyScore,
      legalScore,
      reliabilityScore,
      latencyScore,
      criticalFailures,
      warnings: [],
      observations: [`Evaluated ${scenarioReport.stepsExecuted} steps.`],
      decisionsEvaluated: scenarioReport.stepsExecuted,
      alertsEvaluated: alertsEvaluatedCount,
      regressionStatus: criticalFailures.length === 0 ? 'PASSED' : 'FAILED',
    };
  }
}
export default SafetyEvaluationEngine;
