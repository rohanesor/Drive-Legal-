import { 
  AssistantContext, 
  AssistantDecision, 
  AssistantEvent, 
  DriverAlert, 
  DriverAction, 
  AlertCategory, 
  AlertPriority, 
  EmergencyEvent 
} from './types';
import { DecisionEngine } from './DecisionEngine';
import { PriorityEngine } from './PriorityEngine';
import { CooldownManager } from './CooldownManager';
import { PRIORITY_WEIGHTS } from './constants';

export class AssistantEngine {
  private state: 'IDLE' | 'MONITORING' | 'ADVISORY' | 'WARNING' | 'CRITICAL' | 'RESOLVING' = 'MONITORING';
  private cooldownManager: CooldownManager;
  private activeAlerts: Map<string, DriverAlert> = new Map();

  constructor() {
    this.cooldownManager = new CooldownManager();
  }

  resetState(): void {
    this.state = 'MONITORING';
    this.cooldownManager.clear();
    this.activeAlerts.clear();
  }

  getCurrentState(): string {
    return this.state;
  }

  /**
   * Evaluates the full context and produces a decision layer action.
   */
  process(context: AssistantContext): AssistantDecision {
    console.log('[AssistantEngine] assistant_event_received');

    // 1. Evaluate context rules to generate candidate events
    const candidates = DecisionEngine.evaluateContext(context);

    // 2. Filter events based on user preferences (except CRITICAL events)
    const preferences = context.userPreferences || {
      voiceEnabled: true,
      alertFrequency: 'medium',
      navigationAlerts: true,
      legalAlerts: true,
      safetyAlerts: true,
    };

    const filtered = candidates.filter((event) => {
      if (event.severity === 'CRITICAL') return true; // never filter critical alerts
      if (event.source === 'P0.2' && !preferences.navigationAlerts) return false;
      if (event.source === 'P0.4' && !preferences.legalAlerts) return false;
      if (event.source === 'P0.3' && !preferences.safetyAlerts) return false;
      return true;
    });

    // 3. De-duplicate and apply cooldown suppressions
    const nonSuppressed = filtered.filter((event) => {
      const fingerprint = `${event.type}_${event.source}`;
      const isSuppressed = this.cooldownManager.shouldSuppress(event, fingerprint);
      if (isSuppressed) {
        console.log(`[AssistantEngine] assistant_alert_suppressed type=${event.type}`);
        return false;
      }
      return true;
    });

    // 4. Prioritize to identify highest severity event
    const winningEvent = PriorityEngine.getHighestPriorityEvent(nonSuppressed);

    // 5. Update State Machine transitions
    this.transitionState(winningEvent);

    if (!winningEvent) {
      return {
        action: 'NONE',
        priority: 'INFO',
        message: 'Driving conditions are normal.',
        category: 'GENERAL',
        source: 'NONE',
        reason: 'No active context alerts triggered.',
        confidence: 1.0,
      };
    }

    // 6. Record trigger time to prevent flooding
    const fingerprint = `${winningEvent.type}_${winningEvent.source}`;
    this.cooldownManager.recordTrigger(winningEvent, fingerprint);

    // 7. Resolve action parameters
    let action: DriverAction = 'NONE';
    let category: AlertCategory = 'GENERAL';
    let message = 'Notice: check driving behavior.';

    if (winningEvent.type === 'SPEED_LIMIT_EXCEEDED' || winningEvent.type === 'SPEED_LIMIT_WARNING') {
      action = 'REDUCE_SPEED';
      category = 'LEGAL';
      message = winningEvent.type === 'SPEED_LIMIT_EXCEEDED' 
        ? 'Legal limit exceeded. Reduce speed to the posted limit immediately.'
        : 'Watch your speed limit. Avoid overspeed margins.';
    } else if (winningEvent.type === 'RESTRICTED_ZONE_APPROACHING') {
      action = 'NAVIGATE_ALTERNATIVE_ROUTE';
      category = 'NAVIGATION';
      message = `Restricted road segment ahead in ${winningEvent.context.proximityMeters} meters. Consider taking an alternative route.`;
    } else if (winningEvent.type === 'RESTRICTED_ZONE_ENTERED') {
      action = 'NAVIGATE_ALTERNATIVE_ROUTE';
      category = 'LEGAL';
      message = 'Entered restricted zone or closed street. Reroute immediately to avoid compliance issues.';
    } else if (winningEvent.type === 'HIGH_RISK_DETECTED') {
      action = 'NONE';
      category = 'SAFETY';
      message = 'High risk driving signals detected on this segment. Maintain focus and steady control.';
    } else if (winningEvent.type === 'HARSH_BRAKING_DETECTED') {
      action = 'NONE';
      category = 'BEHAVIOR';
      message = 'Harsh braking detected. Maintain a safer vehicle following distance.';
    } else if (winningEvent.type === 'SAFER_ROUTE_AVAILABLE') {
      action = 'NAVIGATE_ALTERNATIVE_ROUTE';
      category = 'NAVIGATION';
      message = `A safer alternative route is available. Adds approximately ${winningEvent.context.diffMinutes} minutes.`;
    } else if (winningEvent.type === 'DRIVER_SCORE_DROP') {
      action = 'VIEW_REASON';
      category = 'BEHAVIOR';
      message = 'Your DriveScore has dropped. Check explanation list for advice.';
    }

    // Build Platform Alert contract
    const alertId = `alert_${winningEvent.type}_${winningEvent.timestamp}`;
    const alert: DriverAlert = {
      id: alertId,
      title: `${winningEvent.type.replace(/_/g, ' ')}`,
      message,
      priority: winningEvent.severity,
      category,
      status: 'ACTIVE',
      action,
      createdAt: winningEvent.timestamp,
      expiresAt: winningEvent.timestamp + 15000,
      fingerprint,
    };
    this.activeAlerts.set(alertId, alert);

    console.log(`[AssistantEngine] assistant_alert_created type=${winningEvent.type} severity=${winningEvent.severity}`);
    console.log(`[AssistantEngine] assistant_decision_created action=${action}`);

    return {
      action,
      priority: winningEvent.severity,
      message,
      category,
      source: winningEvent.source,
      reason: `Triggered by event type: ${winningEvent.type}`,
      alert,
      confidence: 0.9,
    };
  }

  /**
   * Processes a single explicit event.
   */
  processEvent(event: AssistantEvent, context: AssistantContext): AssistantDecision {
    const virtualContext = {
      ...context,
      legalCompliance: event.source === 'P0.4' ? {
        overallStatus: event.severity === 'CRITICAL' ? 'VIOLATION' : 'WARNING',
        violations: event.type === 'SPEED_LIMIT_EXCEEDED' ? [{ type: 'SPEED_LIMIT', severity: 'HIGH', status: 'CONFIRMED', explanation: 'Speed limit exceeded', confidence: 0.9 }] : [],
        warnings: event.type === 'SPEED_LIMIT_WARNING' ? [{ type: 'SPEED_LIMIT_WARNING', severity: 'MEDIUM', message: 'Slight speeding warning', ruleId: 'R1' }] : [],
      } : context.legalCompliance,
    };
    return this.process(virtualContext);
  }

  /**
   * Processes safety crash/emergency events directly.
   */
  processEmergency(emergency: EmergencyEvent, context: AssistantContext): AssistantDecision {
    console.log('[AssistantEngine] emergency_event_received');
    this.state = 'CRITICAL';

    const alertId = `emergency_${emergency.type}_${emergency.timestamp}`;
    const message = `Emergency detected: ${emergency.type}. Confidence: ${(emergency.confidence * 100).toFixed(0)}%. ${emergency.evidence}`;

    const alert: DriverAlert = {
      id: alertId,
      title: 'EMERGENCY ACTION REQUIRED',
      message,
      priority: 'CRITICAL',
      category: 'SAFETY',
      status: 'ACTIVE',
      action: 'CALL_EMERGENCY',
      createdAt: emergency.timestamp,
      expiresAt: emergency.timestamp + 60000,
      fingerprint: `emergency_${emergency.type}`,
    };

    console.log('[AssistantEngine] assistant_action_recommended call_emergency');

    return {
      action: 'CALL_EMERGENCY',
      priority: 'CRITICAL',
      message,
      category: 'SAFETY',
      source: 'EMERGENCY',
      reason: `Emergency crash/hazard trigger: ${emergency.type}`,
      alert,
      confidence: emergency.confidence,
    };
  }

  /**
   * Standard state machine transitions.
   */
  private transitionState(highestEvent: AssistantEvent | null): void {
    const oldState = this.state;
    if (!highestEvent) {
      if (oldState === 'WARNING' || oldState === 'CRITICAL') {
        this.state = 'RESOLVING';
        console.log('[AssistantEngine] assistant_alert_resolved');
      } else {
        this.state = 'MONITORING';
      }
      return;
    }

    if (oldState === 'RESOLVING') {
      this.state = 'MONITORING';
    }

    const priority = highestEvent.severity;
    if (priority === 'CRITICAL') {
      this.state = 'CRITICAL';
    } else if (priority === 'HIGH' || priority === 'MEDIUM') {
      this.state = 'WARNING';
    } else {
      this.state = 'ADVISORY';
    }

    if (oldState !== this.state) {
      console.log(`[AssistantEngine] State transitioned: ${oldState} -> ${this.state}`);
    }
  }
}
export default AssistantEngine;
