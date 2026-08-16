import { DriverRiskContext, RiskSignal } from './types';
import { RISK_THRESHOLDS } from './constants';

export class RiskSignalProcessor {
  /**
   * Evaluates the raw telemetry and environmental details to detect active risk signals.
   */
  static processSignals(context: DriverRiskContext): RiskSignal[] {
    const signals: RiskSignal[] = [];

    // 1. SPEEDING signal
    const { currentSpeed, acceleration, brakingIntensity } = context.vehicleState;
    const { currentSpeedLimit, isNearIntersection, isSchoolZone, isPedestrianHeavy, isRestrictedRoad, routeSafetyScore } = context.roadContext;

    if (currentSpeedLimit > 0 && currentSpeed > currentSpeedLimit) {
      const delta = currentSpeed - currentSpeedLimit;
      const severity = Math.min(1.0, delta / RISK_THRESHOLDS.SPEEDING_MAJOR);
      signals.push({
        type: 'SPEEDING',
        severity,
        contribution: 0, // calculated later by Scorer
        explanation: `Vehicle speed (${currentSpeed} km/h) is above the legal speed limit (${currentSpeedLimit} km/h).`,
      });
    }

    // 2. HARSH_BRAKING signal
    if (brakingIntensity >= RISK_THRESHOLDS.HARSH_BRAKING) {
      const severity = Math.min(1.0, brakingIntensity / 7.0);
      signals.push({
        type: 'HARSH_BRAKING',
        severity,
        contribution: 0,
        explanation: `Harsh braking event detected at intensity of ${brakingIntensity.toFixed(1)} m/s².`,
      });
    }

    // 3. RAPID_ACCELERATION signal
    if (acceleration >= RISK_THRESHOLDS.RAPID_ACCELERATION) {
      const severity = Math.min(1.0, acceleration / 6.0);
      signals.push({
        type: 'RAPID_ACCELERATION',
        severity,
        contribution: 0,
        explanation: `Rapid acceleration event detected at ${acceleration.toFixed(1)} m/s².`,
      });
    }

    // 4. HIGH_RISK_ROAD signal (integrated with P0.2 Safe Route score)
    if (routeSafetyScore !== undefined && routeSafetyScore < RISK_THRESHOLDS.POOR_SAFETY_SCORE) {
      const severity = Math.min(1.0, (RISK_THRESHOLDS.POOR_SAFETY_SCORE - routeSafetyScore) / 40.0);
      signals.push({
        type: 'HIGH_RISK_ROAD',
        severity,
        contribution: 0,
        explanation: `Route safety score is low (${routeSafetyScore}/100) indicating poor road/infrastructure conditions.`,
      });
    }

    // 5. INTERSECTION proximity signal
    if (isNearIntersection) {
      signals.push({
        type: 'INTERSECTION',
        severity: 0.8,
        contribution: 0,
        explanation: `Vehicle is approaching or traversing a high-risk intersection node.`,
      });
    }

    // 6. SCHOOL_ZONE signal
    if (isSchoolZone) {
      signals.push({
        type: 'SCHOOL_ZONE',
        severity: 1.0,
        contribution: 0,
        explanation: `Vehicle is inside a high-precaution school zone safety corridor.`,
      });
    }

    // 7. PEDESTRIAN_ZONE signal
    if (isPedestrianHeavy) {
      signals.push({
        type: 'PEDESTRIAN_ZONE',
        severity: 0.9,
        contribution: 0,
        explanation: `Vehicle is within a high-density pedestrian activity sector.`,
      });
    }

    // 8. RESTRICTED_ROAD signal
    if (isRestrictedRoad) {
      signals.push({
        type: 'RESTRICTED_ROAD',
        severity: 1.0,
        contribution: 0,
        explanation: `Vehicle is driving on a restricted access segment or closed corridor.`,
      });
    }

    // 9. Environmental LOW_VISIBILITY signal
    if (context.environmentalContext?.visibility !== undefined && context.environmentalContext.visibility < RISK_THRESHOLDS.LOW_VISIBILITY) {
      const visibility = context.environmentalContext.visibility;
      const severity = Math.min(1.0, (RISK_THRESHOLDS.LOW_VISIBILITY - visibility) / RISK_THRESHOLDS.LOW_VISIBILITY);
      signals.push({
        type: 'LOW_VISIBILITY',
        severity,
        contribution: 0,
        explanation: `Visibility is restricted to ${visibility} meters.`,
      });
    }

    // 10. Environmental WEATHER_RISK signal
    if (context.environmentalContext?.weather && context.environmentalContext.weather !== 'clear') {
      const weather = context.environmentalContext.weather;
      const severity = weather === 'storm' ? 0.9 : weather === 'fog' ? 0.8 : weather === 'rain' ? 0.5 : 0.2;
      signals.push({
        type: 'WEATHER_RISK',
        severity,
        contribution: 0,
        explanation: `Adverse environmental weather conditions active: ${weather}.`,
      });
    }

    // 11. REPEATED_RISK_BEHAVIOR signal
    const { repeatedSpeedingCount, harshBrakingCount, rapidAccelerationCount, unsafePatternPersistenceScore } = context.driverBehavior;
    if (repeatedSpeedingCount > 1 || harshBrakingCount > 1 || rapidAccelerationCount > 1 || unsafePatternPersistenceScore > 30) {
      const severity = Math.min(
        1.0,
        (repeatedSpeedingCount * 0.3) +
        (harshBrakingCount * 0.2) +
        (rapidAccelerationCount * 0.1) +
        (unsafePatternPersistenceScore / 100.0)
      );
      signals.push({
        type: 'REPEATED_RISK_BEHAVIOR',
        severity,
        contribution: 0,
        explanation: `Driver shows repeated risky actions (Speeding: ${repeatedSpeedingCount}, Braking: ${harshBrakingCount}, Acceleration: ${rapidAccelerationCount}).`,
      });
    }

    return signals;
  }
}
