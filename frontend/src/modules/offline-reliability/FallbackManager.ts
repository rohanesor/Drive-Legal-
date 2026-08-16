import { FailureDomain } from './types';

export class FallbackManager {
  private criticalityLevels: Map<FailureDomain, 'CORE' | 'IMPORTANT' | 'OPTIONAL'> = new Map();

  constructor() {
    this.criticalityLevels.set('LEGAL', 'CORE');
    this.criticalityLevels.set('RISK', 'CORE');
    this.criticalityLevels.set('NAVIGATION', 'CORE');
    this.criticalityLevels.set('SECURITY', 'IMPORTANT');
    this.criticalityLevels.set('DRIVER', 'IMPORTANT');
    this.criticalityLevels.set('VOICE', 'OPTIONAL');
  }

  getCriticality(domain: FailureDomain): 'CORE' | 'IMPORTANT' | 'OPTIONAL' {
    return this.criticalityLevels.get(domain) || 'OPTIONAL';
  }

  resolveFallback(domain: FailureDomain, errorType: string): string {
    if (domain === 'VOICE') {
      return 'FALLBACK_VISUAL_ALERT';
    }
    if (domain === 'DATASETS') {
      return 'FALLBACK_PREVIOUS_DATASET';
    }
    return 'UNAVAILABLE';
  }
}
export default FallbackManager;
