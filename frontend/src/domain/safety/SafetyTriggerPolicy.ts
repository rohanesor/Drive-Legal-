export interface SafetyTriggerConfig {
  baseTriggerMeters: number;
  activeMeters: number;
  speedScaleFactor: number;
}

export class SafetyTriggerPolicy {
  /**
   * Calculates dynamic warning trigger distance based on vehicle speed and hazard severity.
   */
  getTriggerDistanceMeters(
    currentSpeedKmh: number,
    hazardType: 'SPEED_BREAKER' | 'SPEED_HUMP' | 'SHARP_CURVE' | 'HAIRPIN'
  ): number {
    const speed = Math.max(20, currentSpeedKmh);

    switch (hazardType) {
      case 'HAIRPIN':
        // Earlier warning for hairpins: at 60 km/h -> 600m
        return Math.round(Math.min(800, 350 + speed * 4));
      case 'SHARP_CURVE':
        // At 60 km/h -> 450m
        return Math.round(Math.min(600, 250 + speed * 3.5));
      case 'SPEED_BREAKER':
      case 'SPEED_HUMP':
        // Speed breakers: at 50 km/h -> 250m
        return Math.round(Math.min(400, 150 + speed * 2));
      default:
        return 300;
    }
  }

  /**
   * Returns active zone threshold distance (when warning enters active warning zone).
   */
  getActiveZoneMeters(hazardType: string): number {
    if (hazardType === 'HAIRPIN' || hazardType === 'SHARP_CURVE') {
      return 120;
    }
    return 80;
  }
}

export const safetyTriggerPolicy = new SafetyTriggerPolicy();
export default safetyTriggerPolicy;
