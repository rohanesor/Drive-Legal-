import type { MapLocation, Route } from '../../types';
import { curveDetector, DetectedCurve } from './CurveDetector';
import { speedBreakerDetector, RoadHazard } from './SpeedBreakerDetector';

export interface UnifiedRoadHazard {
  id: string;
  type: 'SPEED_BREAKER' | 'SPEED_HUMP' | 'RAISED_CROSSING' | 'NORMAL_CURVE' | 'SHARP_CURVE' | 'HAIRPIN' | 'SCHOOL_ZONE' | 'ACCIDENT_ZONE';
  location: MapLocation;
  distanceAlongRoute: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  voiceMessage: string;
  source: string;
}

export class RoadHazardEngine {
  /**
   * Analyzes route geometry and queries hazard providers to generate a unified list of road hazards.
   */
  async analyzeRoute(route: Route): Promise<UnifiedRoadHazard[]> {
    if (!route || !route.coords || route.coords.length === 0) return [];

    const unified: UnifiedRoadHazard[] = [];

    // 1. Detect curves geometrically from route coordinates
    const curves = curveDetector.detectCurves(route.coords);
    for (const c of curves) {
      // Only include sharp curves and hairpins in primary hazard notifications
      if (c.type === 'SHARP_CURVE' || c.type === 'HAIRPIN') {
        const voiceMessage =
          c.type === 'HAIRPIN'
            ? 'Hairpin bend ahead. Reduce speed and proceed carefully.'
            : 'Sharp curve ahead in 500 metres. Reduce speed.';

        unified.push({
          id: c.id,
          type: c.type,
          location: c.location,
          distanceAlongRoute: c.distanceAlongRoute,
          severity: c.severity,
          description: c.type === 'HAIRPIN' ? 'Hairpin Bend (>75°)' : 'Sharp Curve (>40°)',
          voiceMessage,
          source: 'geometry_curve_detector',
        });
      }
    }

    // 2. Detect speed humps & traffic calming along route corridor
    try {
      const humps = await speedBreakerDetector.detectSpeedBreakers(route.coords);
      for (const h of humps) {
        unified.push({
          id: h.id,
          type: h.type,
          location: { lat: h.latitude, lng: h.longitude },
          distanceAlongRoute: h.distanceAlongRoute,
          severity: h.severity,
          description: 'Speed Breaker / Hump',
          voiceMessage: 'Speed breaker ahead. Slow down.',
          source: h.source,
        });
      }
    } catch (e) {
      console.warn('[RoadHazardEngine] Speed breaker query skipped:', e);
    }

    // Sort all hazards in order along route
    return unified.sort((a, b) => a.distanceAlongRoute - b.distanceAlongRoute);
  }

  /**
   * Returns human-readable hazard summary for Route Preview sheet.
   */
  getHazardSummary(hazards: UnifiedRoadHazard[]): string[] {
    if (!hazards || hazards.length === 0) {
      return ['Direct pathway with clear geometry'];
    }

    const sharpCurves = hazards.filter(h => h.type === 'SHARP_CURVE').length;
    const hairpins = hazards.filter(h => h.type === 'HAIRPIN').length;
    const speedHumps = hazards.filter(h => h.type === 'SPEED_BREAKER' || h.type === 'SPEED_HUMP').length;

    const summary: string[] = [];
    if (hairpins > 0) summary.push(`⚠ ${hairpins} hairpin bend${hairpins > 1 ? 's' : ''}`);
    if (sharpCurves > 0) summary.push(`⚠ ${sharpCurves} sharp curve${sharpCurves > 1 ? 's' : ''}`);
    if (speedHumps > 0) summary.push(`⚠ ${speedHumps} speed breaker${speedHumps > 1 ? 's' : ''}`);

    return summary.length > 0 ? summary : ['Optimal highway alignment'];
  }
}

export const roadHazardEngine = new RoadHazardEngine();
export default roadHazardEngine;
