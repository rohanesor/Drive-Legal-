import type { MapLocation, Route, MapZone } from '../../types';

export interface SafetyEvent {
  type:
    | 'SPEED_LIMIT'
    | 'SPEED_BREAKER'
    | 'SHARP_CURVE'
    | 'HAIRPIN'
    | 'SCHOOL_ZONE'
    | 'RESTRICTED_ZONE'
    | 'NO_PARKING'
    | 'ACCIDENT_PRONE_AREA'
    | 'TOLL'
    | 'STATE_BORDER'
    | 'TALUK_BORDER'
    | 'ROAD_HAZARD';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  distanceMeters: number;
  message: string;
  recommendedAction: 'REDUCE_SPEED' | 'KEEP_LEFT' | 'PREPARE_TO_STOP' | 'USE_CAUTION' | 'NONE';
}

export class SafetyEngine {
  /**
   * Scans the route coordinates ahead of current location and evaluates safety events.
   */
  evaluateSafety(
    currentLocation: MapLocation,
    currentSpeedKmh: number,
    route: Route,
    currentCoordIndex: number,
    zones: MapZone[],
    speedLimit: number
  ): SafetyEvent[] {
    const events: SafetyEvent[] = [];
    const routeCoords = route.coords;
    if (routeCoords.length === 0) return [];

    // 1. Evaluate speeding
    if (speedLimit > 0 && currentSpeedKmh > speedLimit) {
      events.push({
        type: 'SPEED_LIMIT',
        severity: currentSpeedKmh - speedLimit > 15 ? 'HIGH' : 'MEDIUM',
        distanceMeters: 0,
        message: `Speeding! Limit is ${speedLimit} km/h. Slow down.`,
        recommendedAction: 'REDUCE_SPEED',
      });
    }

    // 2. Evaluate curvature ahead (scan next 30 coordinates or ~300 meters)
    const scanAheadCount = 30;
    const startIndex = Math.max(0, currentCoordIndex);
    const endIndex = Math.min(routeCoords.length - 1, startIndex + scanAheadCount);

    let curveCount = 0;
    let maxCurveAngle = 0;
    let maxCurveIndex = -1;

    for (let i = startIndex; i < endIndex - 2; i++) {
      const a = routeCoords[i];
      const b = routeCoords[i + 1];
      const c = routeCoords[i + 2];

      const deviationAngle = this.getAngleDeviation(a, b, c);
      
      // Filter out small noises
      if (deviationAngle > 40) {
        curveCount++;
        if (deviationAngle > maxCurveAngle) {
          maxCurveAngle = deviationAngle;
          maxCurveIndex = i + 1;
        }
      }
    }

    if (maxCurveIndex !== -1) {
      const distanceToCurve = this.calculateRouteDistance(
        routeCoords,
        startIndex,
        maxCurveIndex
      );

      // Alert thresholds: low-priority < 300m, high-priority < 100m
      if (distanceToCurve <= 300) {
        const isHairpin = maxCurveAngle >= 110;
        const isWinding = curveCount >= 3;

        if (isHairpin) {
          events.push({
            type: 'HAIRPIN',
            severity: 'HIGH',
            distanceMeters: Math.round(distanceToCurve),
            message: `Hairpin turn ahead in ${Math.round(distanceToCurve)} meters.`,
            recommendedAction: 'REDUCE_SPEED',
          });
        } else if (isWinding) {
          events.push({
            type: 'ROAD_HAZARD',
            severity: 'MEDIUM',
            distanceMeters: Math.round(distanceToCurve),
            message: `Winding roads ahead for the next segment.`,
            recommendedAction: 'USE_CAUTION',
          });
        } else {
          events.push({
            type: 'SHARP_CURVE',
            severity: distanceToCurve < 80 ? 'HIGH' : 'MEDIUM',
            distanceMeters: Math.round(distanceToCurve),
            message: `Sharp turn ahead in ${Math.round(distanceToCurve)} meters.`,
            recommendedAction: 'REDUCE_SPEED',
          });
        }
      }
    }

    // 3. Evaluate zones intersection
    zones.forEach(zone => {
      if (!zone.coords || zone.coords.length === 0) return;
      const zoneCenter = zone.coords[0];
      const dist = this.haversineDistance(currentLocation, zoneCenter);
      
      const radius = zone.radius || 400;
      if (dist <= radius + 150) { // Notify slightly before entering
        const distanceToZone = Math.max(0, dist - radius);
        
        let type: SafetyEvent['type'] = 'RESTRICTED_ZONE';
        let recommendedAction: SafetyEvent['recommendedAction'] = 'USE_CAUTION';
        let severity: SafetyEvent['severity'] = 'MEDIUM';

        if (zone.type === 'accident_zone') {
          type = 'ACCIDENT_PRONE_AREA';
          recommendedAction = 'USE_CAUTION';
          severity = 'HIGH';
        } else if (zone.type === 'school_zone') {
          type = 'SCHOOL_ZONE';
          recommendedAction = 'REDUCE_SPEED';
          severity = 'MEDIUM';
        } else if (zone.type === 'restricted_zone') {
          type = 'RESTRICTED_ZONE';
          recommendedAction = 'USE_CAUTION';
          severity = 'MEDIUM';
        }

        events.push({
          type,
          severity,
          distanceMeters: Math.round(distanceToZone),
          message: `${zone.name} ahead. ${recommendedAction === 'REDUCE_SPEED' ? 'Reduce speed.' : 'Drive carefully.'}`,
          recommendedAction,
        });
      }
    });

    return events;
  }

  private getAngleDeviation(a: MapLocation, b: MapLocation, c: MapLocation): number {
    const abX = b.lng - a.lng;
    const abY = b.lat - a.lat;
    const bcX = c.lng - b.lng;
    const bcY = c.lat - b.lat;

    const dot = abX * bcX + abY * bcY;
    const magAB = Math.sqrt(abX * abX + abY * abY);
    const magBC = Math.sqrt(bcX * bcX + bcY * bcY);

    if (magAB === 0 || magBC === 0) return 0;
    
    const cos = dot / (magAB * magBC);
    const angleRad = Math.acos(Math.max(-1, Math.min(1, cos)));
    return (angleRad * 180) / Math.PI; // returns deviation angle in degrees
  }

  private calculateRouteDistance(
    coords: MapLocation[],
    start: number,
    end: number
  ): number {
    let dist = 0;
    for (let i = start; i < end; i++) {
      dist += this.haversineDistance(coords[i], coords[i + 1]);
    }
    return dist;
  }

  private haversineDistance(p1: MapLocation, p2: MapLocation): number {
    const R = 6371000;
    const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
    const dLon = ((p2.lng - p1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((p1.lat * Math.PI) / 180) *
        Math.cos((p2.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

export const safetyEngine = new SafetyEngine();
