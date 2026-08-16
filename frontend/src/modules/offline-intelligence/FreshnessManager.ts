import { FreshnessState } from './types';

export class FreshnessManager {
  private lastUpdated: Map<string, number> = new Map();
  private ttls: Map<string, number> = new Map();

  registerSource(key: string, ttlMs: number): void {
    this.ttls.set(key, ttlMs);
    this.lastUpdated.set(key, Date.now());
  }

  updateSource(key: string): void {
    this.lastUpdated.set(key, Date.now());
  }

  getFreshness(key: string): FreshnessState {
    const updated = this.lastUpdated.get(key);
    const ttl = this.ttls.get(key);

    if (!updated || !ttl) return 'UNAVAILABLE';

    const elapsed = Date.now() - updated;
    if (elapsed > ttl) {
      return 'STALE';
    } else if (elapsed > ttl * 0.7) {
      return 'AGING';
    }
    return 'CURRENT';
  }
}
export default FreshnessManager;
