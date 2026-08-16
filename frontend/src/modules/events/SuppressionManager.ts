import { DrivingEvent } from './types';

export class SuppressionManager {
  private cooldowns: Map<string, number> = new Map();
  private defaultCooldownMs = 30000; // 30 seconds

  /**
   * Evaluates if a driving event should be suppressed.
   */
  shouldSuppress(event: DrivingEvent, segmentId?: string): boolean {
    const segment = segmentId || 'global';
    const key = `${event.type}_${segment}`;
    
    const expiry = this.cooldowns.get(key);
    if (expiry !== undefined && expiry > Date.now()) {
      return true;
    }

    this.cooldowns.set(key, Date.now() + this.defaultCooldownMs);
    return false;
  }

  clear(): void {
    this.cooldowns.clear();
  }
}
export default SuppressionManager;
