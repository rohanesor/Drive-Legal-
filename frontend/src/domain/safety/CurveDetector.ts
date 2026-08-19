import type { MapLocation } from '../../types';

export type CurveType = 'NORMAL_CURVE' | 'SHARP_CURVE' | 'HAIRPIN';

export interface DetectedCurve {
  id: string;
  type: CurveType;
  location: MapLocation;
  distanceAlongRoute: number; // in meters from route start
  headingChange: number; // angle in degrees
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number;
}

export interface CurveThresholds {
  minSegmentMeters: number; // Minimum segment distance to evaluate curve (to ignore noise)
  normalCurveDeg: number; // 15 degrees
  sharpCurveDeg: number; // 40 degrees
  hairpinDeg: number; // 75 degrees
}

export const DEFAULT_CURVE_THRESHOLDS: CurveThresholds = {
  minSegmentMeters: 5,
  normalCurveDeg: 15,
  sharpCurveDeg: 40,
  hairpinDeg: 75,
};

export class CurveDetector {
  private thresholds: CurveThresholds;

  constructor(thresholds: CurveThresholds = DEFAULT_CURVE_THRESHOLDS) {
    this.thresholds = thresholds;
  }

  /**
   * Analyzes route geometry coordinates and identifies road curves, sharp turns, and hairpins.
   */
  detectCurves(routeCoords: MapLocation[]): DetectedCurve[] {
    const curves: DetectedCurve[] = [];
    if (!routeCoords || routeCoords.length < 3) return [];

    // Smooth geometry coordinates to reduce noise
    const smoothed = this.smoothGeometry(routeCoords);
    let cumulativeDistance = 0;

    for (let i = 0; i < smoothed.length - 2; i++) {
      const p1 = smoothed[i];
      const p2 = smoothed[i + 1];
      const p3 = smoothed[i + 2];

      const distP1P2 = this.haversineDistance(p1, p2);
      cumulativeDistance += distP1P2;

      // Filter out micro-segments under minSegmentMeters to prevent false positives from GPS noise
      if (distP1P2 < this.thresholds.minSegmentMeters) {
        continue;
      }

      const heading1 = this.calculateBearing(p1, p2);
      const heading2 = this.calculateBearing(p2, p3);

      let deltaHeading = Math.abs(heading2 - heading1);
      if (deltaHeading > 180) {
        deltaHeading = 360 - deltaHeading;
      }

      if (deltaHeading >= this.thresholds.normalCurveDeg) {
        let type: CurveType = 'NORMAL_CURVE';
        let severity: DetectedCurve['severity'] = 'LOW';

        if (deltaHeading >= this.thresholds.hairpinDeg) {
          type = 'HAIRPIN';
          severity = 'HIGH';
        } else if (deltaHeading >= this.thresholds.sharpCurveDeg) {
          type = 'SHARP_CURVE';
          severity = 'MEDIUM';
        }

        const id = `curve_${Math.round(p2.lat * 10000)}_${Math.round(p2.lng * 10000)}_${i}`;
        
        // Ensure no duplicate curve reported within 30 meters of previous curve
        const isDuplicate = curves.some(
          c => Math.abs(c.distanceAlongRoute - cumulativeDistance) < 30
        );

        if (!isDuplicate) {
          curves.push({
            id,
            type,
            location: p2,
            distanceAlongRoute: Math.round(cumulativeDistance),
            headingChange: Math.round(deltaHeading),
            severity,
            confidence: deltaHeading > 50 ? 0.95 : 0.85,
          });
        }
      }
    }

    return curves;
  }

  /**
   * Applies 3-point moving average smoothing to eliminate raw coordinate jitter.
   */
  private smoothGeometry(coords: MapLocation[]): MapLocation[] {
    if (coords.length < 3) return coords;
    const result: MapLocation[] = [coords[0]];

    for (let i = 1; i < coords.length - 1; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
      const next = coords[i + 1];

      result.push({
        lat: (prev.lat + curr.lat + next.lat) / 3,
        lng: (prev.lng + curr.lng + next.lng) / 3,
      });
    }

    result.push(coords[coords.length - 1]);
    return result;
  }

  private calculateBearing(start: MapLocation, end: MapLocation): number {
    const startLat = (start.lat * Math.PI) / 180;
    const startLng = (start.lng * Math.PI) / 180;
    const endLat = (end.lat * Math.PI) / 180;
    const endLng = (end.lng * Math.PI) / 180;

    const dLng = endLng - startLng;
    const y = Math.sin(dLng) * Math.cos(endLat);
    const x =
      Math.cos(startLat) * Math.sin(endLat) -
      Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);

    let brng = (Math.atan2(y, x) * 180) / Math.PI;
    return (brng + 360) % 360;
  }

  private haversineDistance(p1: MapLocation, p2: MapLocation): number {
    const R = 6371000;
    const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
    const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((p1.lat * Math.PI) / 180) *
        Math.cos((p2.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

export const curveDetector = new CurveDetector();
export default curveDetector;
