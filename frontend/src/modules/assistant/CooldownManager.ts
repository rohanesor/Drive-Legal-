import { AssistantEvent, AlertPriority } from './types';
import { ASSISTANT_COOLDOWNS_MS } from './constants';

export class CooldownManager {
  private lastTriggeredTimes: Map<string, number> = new Map();
  private lastSeverities: Map<string, AlertPriority> = new Map();

  /**
   * Evaluates if a given event type is currently in a cooldown period.
   * Critical alerts are never suppressed.
   * If severity is higher than last time (escalation), cooldown is bypassed.
   */
  shouldSuppress(event: AssistantEvent, fingerprint: string): boolean {
    // Critical events are never suppressed
    if (event.severity === 'CRITICAL') {
      return false;
    }

    const now = Date.now();
    const lastTime = this.lastTriggeredTimes.get(fingerprint);
    const lastSeverity = this.lastSeverities.get(fingerprint);

    // If severity escalated, bypass cooldown suppression
    if (lastSeverity && this.isEscalated(lastSeverity, event.severity)) {
      return false;
    }

    const cooldownMs = (ASSISTANT_COOLDOWNS_MS as any)[event.type] ?? 30000;
    if (lastTime && (now - lastTime < cooldownMs)) {
      return true; // Suppressed
    }

    return false;
  }

  /**
   * Updates the trigger history for the event fingerprint.
   */
  recordTrigger(event: AssistantEvent, fingerprint: string): void {
    this.lastTriggeredTimes.set(fingerprint, Date.now());
    this.lastSeverities.set(fingerprint, event.severity);
  }

  /**
   * Helper to determine if current priority is higher than previous.
   */
  private isEscalated(prev: AlertPriority, curr: AlertPriority): boolean {
    const weights: Record<AlertPriority, number> = {
      CRITICAL: 5,
      HIGH: 4,
      MEDIUM: 3,
      LOW: 2,
      INFO: 1,
    };
    return weights[curr] > weights[prev];
  }

  clear(): void {
    this.lastTriggeredTimes.clear();
    this.lastSeverities.clear();
  }
}
export default CooldownManager;
