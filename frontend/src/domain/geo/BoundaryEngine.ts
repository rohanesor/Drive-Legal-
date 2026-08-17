import type { MapLocation } from '../../types';

export interface GeoContext {
  country: string;
  state: string;
  stateCode: string;
  district: string;
  taluk: string;
}

export class BoundaryEngine {
  private lastContext: GeoContext | null = null;
  private lastTriggeredCoords: MapLocation | null = null;

  /**
   * Evaluates coordinate updates. Detects state border crossings using
   * 150-meter debounce hysteresis to prevent GPS jitter.
   * 
   * Returns a state boundary crossing announcement message if crossed, otherwise null.
   */
  evaluateBoundary(
    currentCoords: MapLocation,
    currentContext: GeoContext
  ): string | null {
    if (!this.lastContext) {
      this.lastContext = currentContext;
      this.lastTriggeredCoords = currentCoords;
      return null;
    }

    const previousStateCode = this.lastContext.stateCode;
    const currentStateCode = currentContext.stateCode;

    // Detect state code change
    if (previousStateCode !== 'UNKNOWN' && currentStateCode !== 'UNKNOWN' && previousStateCode !== currentStateCode) {
      // 1. Calculate distance from last triggered crossing coordinate to prevent boundary jittering
      if (this.lastTriggeredCoords) {
        const dist = this.haversineDistance(currentCoords, this.lastTriggeredCoords);
        if (dist < 150) {
          console.log(`[BoundaryEngine] State code changed but user is within hysteresis debounce threshold (${Math.round(dist)}m < 150m). Ignoring.`);
          return null;
        }
      }

      this.lastContext = currentContext;
      this.lastTriggeredCoords = currentCoords;
      
      const stateName = currentContext.state || currentContext.stateCode;
      return `Entering ${stateName}. Traffic laws and penalties updated for this jurisdiction.`;
    }

    // Update last known context without triggering crossing alerts
    this.lastContext = currentContext;
    return null;
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

export const boundaryEngine = new BoundaryEngine();
export default boundaryEngine;
