import { Decision } from './types';

export class DecisionPolicyGate {
  /**
   * Evaluates proposed actions against the authority hierarchy:
   * Safety > Legal > Alert Policy > Tool Policy > User Request > Preferences
   */
  static validateDecision(decision: Decision): Decision {
    const containsRisk = decision.constraints.some((c) => c.includes('HIGH_RISK') || c.includes('DANGER'));
    const containsViolation = decision.constraints.some((c) => c.includes('RESTRICTED') || c.includes('PROHIBITED'));

    const hasProhibitedControl = decision.actions.some(
      (a) => a === 'STEER' || a === 'BRAKE' || a === 'THROTTLE' || a === 'GEAR'
    );

    if (hasProhibitedControl) {
      return {
        ...decision,
        recommendation: 'Refused: Prohibited vehicle control actions detected.',
        actions: [],
        status: 'BLOCKED',
      };
    }

    if (containsViolation) {
      return {
        ...decision,
        recommendation: 'Refused: Route violates verified legal restrictions.',
        actions: [],
        status: 'BLOCKED',
      };
    }

    if (containsRisk) {
      return {
        ...decision,
        recommendation: 'Refused: High safety risk level detected.',
        actions: [],
        status: 'BLOCKED',
      };
    }

    return {
      ...decision,
      status: 'APPROVED',
    };
  }
}
export default DecisionPolicyGate;
