import { TrafficRule } from './types';
import { DEFAULT_TRAFFIC_RULES } from './constants';

export class JurisdictionResolver {
  private rules: TrafficRule[];

  constructor(customRules: TrafficRule[] = DEFAULT_TRAFFIC_RULES) {
    this.rules = customRules;
  }

  /**
   * Matches hierarchical jurisdiction paths.
   * e.g., context: "IN.TN.Coimbatore" matches rule: "IN", "IN.TN", "IN.TN.Coimbatore".
   */
  resolveRules(jurisdiction: { country: string; state: string; city?: string }): TrafficRule[] {
    const { country, state, city } = jurisdiction;

    const contextPath = [country, state, city].filter(Boolean).join('.');
    const now = new Date().toISOString();

    return this.rules.filter((rule) => {
      if (!rule.enabled) return false;

      // Rule jurisdiction must be a prefix of the context jurisdiction, or vice versa
      const rulePath = rule.jurisdiction;
      const isPathMatch = contextPath.startsWith(rulePath) || rulePath.startsWith(contextPath);
      if (!isPathMatch) return false;

      // Date window validity check
      const isEffective = rule.effectiveFrom <= now && (!rule.effectiveTo || rule.effectiveTo >= now);
      return isEffective;
    });
  }
}
export default JurisdictionResolver;
