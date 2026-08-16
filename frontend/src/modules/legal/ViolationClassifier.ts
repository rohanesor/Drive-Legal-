import { Violation, LegalWarning, TrafficRule } from './types';
import { RuleEvaluationResult } from './RuleEvaluator';

export class ViolationClassifier {
  /**
   * Translates active rule violations into a structured Violation model.
   */
  static classifyViolation(
    rule: TrafficRule,
    evalResult: RuleEvaluationResult,
    detectedAt: number
  ): Violation {
    // Generate confirmation status based on confidence levels
    const status = evalResult.confidence >= 0.75 ? 'CONFIRMED' : 'POTENTIAL';

    return {
      id: `${rule.id}_${detectedAt}`,
      ruleId: rule.id,
      type: rule.category,
      severity: rule.severity,
      status,
      jurisdiction: rule.jurisdiction,
      detectedAt,
      evidence: evalResult.evidence,
      explanation: evalResult.explanation,
      confidence: evalResult.confidence,
    };
  }

  /**
   * Translates warning results into a proactive driver LegalWarning.
   */
  static classifyWarning(
    rule: TrafficRule,
    evalResult: RuleEvaluationResult,
    distanceMeters?: number
  ): LegalWarning {
    return {
      type: `${rule.category}_WARNING`,
      message: evalResult.explanation,
      severity: rule.severity,
      distanceMeters,
      ruleId: rule.id,
    };
  }
}
export default ViolationClassifier;
