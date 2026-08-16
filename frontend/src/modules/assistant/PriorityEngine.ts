import { AssistantEvent, AlertPriority } from './types';
import { PRIORITY_WEIGHTS } from './constants';

export class PriorityEngine {
  /**
   * Evaluates a list of simultaneous AssistantEvents and returns the single highest priority event.
   * Priority hierarchy order: CRITICAL SAFETY -> IMMEDIATE LEGAL RISK -> NAVIGATION -> BEHAVIOR -> INFO.
   */
  static getHighestPriorityEvent(events: AssistantEvent[]): AssistantEvent | null {
    if (events.length === 0) return null;

    return [...events].sort((a, b) => {
      // 1. Sort by raw severity weights (CRITICAL=5, INFO=1)
      const severityDiff = PRIORITY_WEIGHTS[b.severity] - PRIORITY_WEIGHTS[a.severity];
      if (severityDiff !== 0) return severityDiff;

      // 2. Sort by source categories if severity is equal
      const categoryOrder: Record<string, number> = {
        'EMERGENCY': 5,
        'P0.3': 4, // safety/risk
        'P0.4': 3, // legal
        'P0.2': 2, // navigation
        'P0.5': 1, // drivescore/behavior
      };

      const orderA = categoryOrder[a.source] || 0;
      const orderB = categoryOrder[b.source] || 0;
      return orderB - orderA;
    })[0];
  }
}
export default PriorityEngine;
