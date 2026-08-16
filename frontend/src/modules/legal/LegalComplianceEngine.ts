import { LegalContext, LegalComplianceResult, Violation, LegalWarning, TrafficRule } from './types';
import { JurisdictionResolver } from './JurisdictionResolver';
import { RuleEvaluator } from './RuleEvaluator';
import { ViolationClassifier } from './ViolationClassifier';
import { LegalExplanation } from './LegalExplanation';
import { DEFAULT_TRAFFIC_RULES } from './constants';

export class LegalComplianceEngine {
  private resolver: JurisdictionResolver;

  constructor(rulesList: TrafficRule[] = DEFAULT_TRAFFIC_RULES) {
    this.resolver = new JurisdictionResolver(rulesList);
  }

  /**
   * Main entry point to evaluate the current context against all active rules.
   */
  evaluate(context: LegalContext): LegalComplianceResult {
    console.log('[LegalComplianceEngine] legal_evaluation_started');

    // 1. Resolve jurisdiction rules
    const rules = this.resolver.resolveRules(context.jurisdiction);
    console.log(`[LegalComplianceEngine] jurisdiction_resolved count=${rules.length}`);

    const violations: Violation[] = [];
    const warnings: LegalWarning[] = [];
    const compliantRules: string[] = [];
    const unknownRules: string[] = [];
    let sumConfidence = 0;
    const detectedAt = Date.now();

    // 2. Evaluate each rule
    rules.forEach((rule) => {
      const evalResult = RuleEvaluator.evaluateRule(rule, context);
      sumConfidence += evalResult.confidence;
      console.log(`[LegalComplianceEngine] rule_evaluated id=${rule.id} status=${evalResult.status}`);

      if (evalResult.status === 'COMPLIANT') {
        compliantRules.push(rule.id);
      } else if (evalResult.status === 'UNKNOWN') {
        unknownRules.push(rule.id);
      } else if (evalResult.status === 'WARNING') {
        const warning = ViolationClassifier.classifyWarning(
          rule,
          evalResult,
          context.roadContext.warningProximityMeters
        );
        warnings.push(warning);
        console.log(`[LegalComplianceEngine] legal_warning_detected category=${rule.category}`);
      } else if (evalResult.status === 'VIOLATION') {
        const violation = ViolationClassifier.classifyViolation(rule, evalResult, detectedAt);
        
        // Enrich explanation with safe legal advisory messaging
        violation.explanation = LegalExplanation.getSafeAdvisoryMessage(rule.category, violation.explanation);
        violations.push(violation);

        if (violation.status === 'CONFIRMED') {
          console.log(`[LegalComplianceEngine] violation_confirmed category=${rule.category}`);
        } else {
          console.log(`[LegalComplianceEngine] potential_violation_detected category=${rule.category}`);
        }
      }
    });

    // 3. Compute overall compliance summary status
    let overallStatus: 'COMPLIANT' | 'WARNING' | 'VIOLATION' | 'UNKNOWN' = 'UNKNOWN';
    if (violations.length > 0) {
      overallStatus = 'VIOLATION';
    } else if (warnings.length > 0) {
      overallStatus = 'WARNING';
    } else if (compliantRules.length > 0) {
      overallStatus = 'COMPLIANT';
    }

    const finalConfidence = rules.length > 0 ? sumConfidence / rules.length : 1.0;
    console.log(`[LegalComplianceEngine] legal_evaluation_completed status=${overallStatus} violationsCount=${violations.length}`);

    return {
      overallStatus,
      violations,
      warnings,
      compliantRules,
      unknownRules,
      confidence: finalConfidence,
    };
  }
}
export default LegalComplianceEngine;
