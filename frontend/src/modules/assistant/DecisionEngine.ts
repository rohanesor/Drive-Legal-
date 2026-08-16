import { AssistantContext, AssistantEvent, AlertPriority } from './types';

export class DecisionEngine {
  /**
   * Deterministically scans the compiled AssistantContext to produce active AssistantEvents.
   * Matches core rules (e.g. speeding, proximity warn boundaries, unsafe scores, reroutes).
   */
  static evaluateContext(context: AssistantContext): AssistantEvent[] {
    const events: AssistantEvent[] = [];
    const timestamp = context.timestamp;

    // 1. Check speeding and legal compliance events
    if (context.legalCompliance) {
      const speedingViolation = context.legalCompliance.violations.find((v) => v.type === 'SPEED_LIMIT');
      if (speedingViolation) {
        events.push({
          type: 'SPEED_LIMIT_EXCEEDED',
          timestamp,
          severity: speedingViolation.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
          source: 'P0.4',
          context: { explanation: speedingViolation.explanation },
        });
      } else {
        const speedingWarning = context.legalCompliance.warnings.find((w) => w.type === 'SPEED_LIMIT_WARNING');
        if (speedingWarning) {
          events.push({
            type: 'SPEED_LIMIT_WARNING',
            timestamp,
            severity: 'MEDIUM',
            source: 'P0.4',
            context: { message: speedingWarning.message },
          });
        }
      }

      // Check entered closed restrictions
      const accessViolation = context.legalCompliance.violations.find(
        (v) => v.type === 'NO_ENTRY' || v.type === 'ONE_WAY' || v.type === 'VEHICLE_RESTRICTION'
      );
      if (accessViolation) {
        events.push({
          type: 'RESTRICTED_ZONE_ENTERED',
          timestamp,
          severity: 'CRITICAL',
          source: 'P0.4',
          context: { explanation: accessViolation.explanation },
        });
      }
    }

    // 2. Check route proximity warning events
    if (context.routeContext) {
      const proximity = context.routeContext.warningProximityMeters;
      const isRestrictedAhead = 
        context.routeContext.isNoEntry || 
        context.routeContext.isOneWay || 
        (context.routeContext.restrictedVehicleTypes && context.routeContext.restrictedVehicleTypes.length > 0);

      if (isRestrictedAhead && proximity !== undefined && proximity > 0) {
        let severity: AlertPriority = 'MEDIUM';
        if (proximity <= 50) severity = 'CRITICAL';
        else if (proximity <= 200) severity = 'HIGH';

        events.push({
          type: 'RESTRICTED_ZONE_APPROACHING',
          timestamp,
          severity,
          source: 'P0.2',
          context: { proximityMeters: proximity },
        });
      }

      if (context.routeContext.isSaferRouteAvailable) {
        events.push({
          type: 'SAFER_ROUTE_AVAILABLE',
          timestamp,
          severity: 'MEDIUM',
          source: 'P0.2',
          context: { diffMinutes: context.routeContext.saferRouteDiffMinutes || 0 },
        });
      }
    }

    // 3. Check driver behavior risk events
    if (context.driverRisk) {
      const riskScore = context.driverRisk.score;
      if (riskScore >= 75) {
        events.push({
          type: 'HIGH_RISK_DETECTED',
          timestamp,
          severity: 'HIGH',
          source: 'P0.3',
          context: { score: riskScore },
        });
      } else if (riskScore >= 45) {
        events.push({
          type: 'HIGH_RISK_DETECTED',
          timestamp,
          severity: 'MEDIUM',
          source: 'P0.3',
          context: { score: riskScore },
        });
      }

      const hasHarshBraking = context.driverRisk.signals.some((s) => s.type === 'HARSH_BRAKING');
      if (hasHarshBraking) {
        events.push({
          type: 'HARSH_BRAKING_DETECTED',
          timestamp,
          severity: 'MEDIUM',
          source: 'P0.3',
          context: {},
        });
      }
    }

    // 4. Check DriveScore decline events
    if (context.driveScore) {
      if (context.driveScore.score < 60) {
        events.push({
          type: 'DRIVER_SCORE_DROP',
          timestamp,
          severity: 'HIGH',
          source: 'P0.5',
          context: { score: context.driveScore.score },
        });
      } else if (context.driveScore.trend === 'DECLINING') {
        events.push({
          type: 'DRIVER_SCORE_DROP',
          timestamp,
          severity: 'MEDIUM',
          source: 'P0.5',
          context: { score: context.driveScore.score },
        });
      }
    }

    return events;
  }
}
export default DecisionEngine;
