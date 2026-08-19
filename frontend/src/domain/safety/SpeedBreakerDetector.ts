import type { MapLocation } from '../../types';

export type SpeedBreakerType = 'SPEED_BREAKER' | 'SPEED_HUMP' | 'RAISED_CROSSING';

export interface RoadHazard {
  id: string;
  type: SpeedBreakerType;
  latitude: number;
  longitude: number;
  distanceAlongRoute: number; // in meters from route origin
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  source: 'overpass_osm' | 'vazhi_db' | 'spatial_index';
  confidence: number;
}

export class SpeedBreakerDetector {
  /**
   * Queries speed humps and traffic calming features along the route corridor.
   */
  async detectSpeedBreakers(routeCoords: MapLocation[]): Promise<RoadHazard[]> {
    if (!routeCoords || routeCoords.length === 0) return [];

    const hazards: RoadHazard[] = [];
    
    // Calculate bounding box for route corridor
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    routeCoords.forEach(c => {
      if (c.lat < minLat) minLat = c.lat;
      if (c.lat > maxLat) maxLat = c.lat;
      if (c.lng < minLng) minLng = c.lng;
      if (c.lng > maxLng) maxLng = c.lng;
    });

    // Add 250m padding (~0.0025 degrees)
    const bbox = `${minLat - 0.0025},${minLng - 0.0025},${maxLat + 0.0025},${maxLng + 0.0025}`;

    try {
      // Query Overpass API for speed humps and traffic calming nodes in the corridor
      const overpassQuery = `[out:json][timeout:5];(node["traffic_calming"](${bbox});node["highway"="speed_camera"](${bbox}););out body;`;
      const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data && data.elements) {
          for (const el of data.elements) {
            const loc: MapLocation = { lat: el.lat, lng: el.lon };
            const distFromRoute = this.minDistanceFromRoute(loc, routeCoords);

            // Only include humps within 40m corridor of the route line
            if (distFromRoute.distance <= 40) {
              const type: SpeedBreakerType = el.tags?.traffic_calming === 'hump' ? 'SPEED_HUMP' : 'SPEED_BREAKER';
              hazards.push({
                id: `sb_${el.id}`,
                type,
                latitude: el.lat,
                longitude: el.lon,
                distanceAlongRoute: Math.round(distFromRoute.distanceAlongRoute),
                severity: 'MEDIUM',
                source: 'overpass_osm',
                confidence: 0.9,
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn('[SpeedBreakerDetector] Overpass fetch skipped or timed out, evaluating corridor geometry:', err);
    }

    // Sort hazards by distance along the route
    return hazards.sort((a, b) => a.distanceAlongRoute - b.distanceAlongRoute);
  }

  private minDistanceFromRoute(
    point: MapLocation,
    routeCoords: MapLocation[]
  ): { distance: number; distanceAlongRoute: number } {
    let minDistance = Infinity;
    let closestIndex = 0;
    let accumulatedDist = 0;
    let bestDistAlongRoute = 0;

    for (let i = 0; i < routeCoords.length - 1; i++) {
      const p1 = routeCoords[i];
      const p2 = routeCoords[i + 1];
      const segLen = this.haversineDistance(p1, p2);
      
      const distToPt = this.haversineDistance(point, p1);
      if (distToPt < minDistance) {
        minDistance = distToPt;
        closestIndex = i;
        bestDistAlongRoute = accumulatedDist;
      }
      accumulatedDist += segLen;
    }

    return { distance: minDistance, distanceAlongRoute: bestDistAlongRoute };
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

export const speedBreakerDetector = new SpeedBreakerDetector();
export default speedBreakerDetector;
