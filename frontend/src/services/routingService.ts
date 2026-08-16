import type { Route, RouteSearchParams } from '../types';
import { MockRoutingProvider } from './mockRoutingProvider';
import { OSMRoutingProvider } from './osmRoutingProvider';
import { driveLegalService } from './driveLegalService';
import { speedLimitService } from './speedLimitService';

class RoutingService {
  private mockProvider = new MockRoutingProvider();
  private osmProvider = new OSMRoutingProvider();

  /**
   * Calculates routes and dynamically scores safety based on local SQLite zones database.
   */
  async calculateRoutes(params: RouteSearchParams): Promise<Route[]> {
    console.log('[RoutingService] Route calculation initiated for vehicle:', params.vehicleType);
    
    let routes: Route[] = [];
    
    try {
      // 1. Try online OSRM routing first
      routes = await this.osmProvider.calculateRoutes(params.origin, params.destination, params.vehicleType);
      
      // If OSRM returned a standard route, generate an alternative route too to support comparison
      if (routes.length === 1) {
        const mockRoutes = await this.mockProvider.calculateRoutes(params.origin, params.destination, params.vehicleType);
        // Add a mock alternative route path
        routes.push({
          ...mockRoutes[1],
          id: 'route_osm_alternative'
        });
      }
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      console.warn('[RoutingService] Online routing failed, falling back to mock offline engine:', err.message);
      
      // 2. Fall back to offline mock route generator
      routes = await this.mockProvider.calculateRoutes(params.origin, params.destination, params.vehicleType);
    }

    // 3. Dynamic Safety Enrichment (Check zones intersected by route)
    for (const route of routes) {
      await this.enrichRouteSafety(route, params.vehicleType);
    }

    return routes;
  }

  /**
   * Samples coordinates along the route and queries Python sqlite zones database for safety analysis.
   */
  private async enrichRouteSafety(route: Route, vehicleType: 'car' | 'motorcycle' | 'heavy'): Promise<void> {
    const coords = route.coords;
    if (coords.length === 0) return;

    const sampledIndices = new Set<number>();
    
    // Sample start, end, and up to 3 intermediate points along the coordinates path
    sampledIndices.add(0);
    sampledIndices.add(coords.length - 1);
    if (coords.length > 2) {
      sampledIndices.add(Math.floor(coords.length * 0.3));
      sampledIndices.add(Math.floor(coords.length * 0.7));
    }

    const uniqueZones = new Map<string, any>();
    let safetyDeduction = 0;
    const hazards: string[] = [];

    let accidentZonesCount = 0;
    let schoolZonesCount = 0;
    let policeZonesCount = 0;
    let unknownCount = 0;

    for (const idx of sampledIndices) {
      const point = coords[idx];
      try {
        const result = await driveLegalService.zoneCheck(
          point.lat,
          point.lng,
          'TN',
          null,
          40,
        );

        if (result.status === 'zone_alert' && result.message) {
          const zoneKey = result.zone_name || 'Unknown Zone';
          if (!uniqueZones.has(zoneKey)) {
            uniqueZones.set(zoneKey, result);
            
            // Apply safety penalties based on zone type
            const zoneType = result.zone_type || 'custom';
            if (zoneType === 'accident_zone') {
              safetyDeduction += 15;
              hazards.push(`Passes through accident-prone zone: ${zoneKey}`);
              accidentZonesCount++;
            } else if (zoneType === 'school_zone') {
              safetyDeduction += 5;
              hazards.push(`Intersects school zone speed zone: ${zoneKey}`);
              schoolZonesCount++;
            } else if (zoneType === 'speed_camera') {
              safetyDeduction += 8;
              hazards.push(`Speed cameras monitored near ${zoneKey}`);
              policeZonesCount++;
            } else {
              unknownCount++;
            }
          }
        }
      } catch (err) {
        unknownCount++;
      }
    }

    // Evaluate Speed Limit safety factors using speedLimitService
    let speedLimitKnown = false;
    let speedLimitCompatible: 'compatible' | 'incompatible' | 'unknown' = 'unknown';
    let dataSources = ['local_sqlite'];
    let status: 'KNOWN' | 'UNKNOWN' | 'STALE' | 'UNVERIFIED' = 'UNKNOWN';

    try {
      const midPoint = coords[Math.floor(coords.length / 2)];
      const speedLimitRes = await speedLimitService.getSpeedLimit(midPoint.lat, midPoint.lng, 'TN', vehicleType);

      if (speedLimitRes.speedLimit && speedLimitRes.speedLimit > 0) {
        speedLimitKnown = true;
        
        // Calculate average speed on route: meters/seconds * 3.6 = km/h
        const avgSpeedKmh = (route.distance / route.duration) * 3.6;
        
        // Compatible if average speed is within speed limit + 5 km/h buffer
        if (avgSpeedKmh <= speedLimitRes.speedLimit + 5) {
          speedLimitCompatible = 'compatible';
        } else {
          speedLimitCompatible = 'incompatible';
          safetyDeduction += 10;
          hazards.push(`Average route speed (${Math.round(avgSpeedKmh)} km/h) exceeds segment speed limit (${speedLimitRes.speedLimit} km/h)`);
        }

        if (speedLimitRes.source === 'osm') {
          dataSources.push('osm_overpass');
          status = 'KNOWN';
        } else if (speedLimitRes.source === 'cached') {
          dataSources.push('async_storage');
          status = 'KNOWN';
        } else {
          status = 'UNVERIFIED'; // State defaults are unverified for this segment
        }
      } else {
        unknownCount++;
      }
    } catch {
      unknownCount++;
    }

    // Dynamic scoring updates
    const score = Math.max(50, 100 - safetyDeduction);
    route.safetyScore = score;
    route.riskFactors = [...hazards, ...route.riskFactors];

    // Determine overall confidence
    let confidence: 'low' | 'medium' | 'high' = 'high';
    if (unknownCount > 1 || !speedLimitKnown) {
      confidence = 'low';
    } else if (status === 'UNVERIFIED') {
      confidence = 'medium';
    }

    route.safety = {
      score,
      confidence,
      factors: {
        speedLimitStatus: speedLimitKnown ? 'known' : 'unknown',
        speedLimitCompatibility: speedLimitCompatible,
        accidentZonesCount,
        schoolZonesCount,
        policeZonesCount,
        unknownCount,
      },
      dataSources,
      status: speedLimitKnown ? status : 'UNKNOWN',
    };
  }

  /**
   * Helper: Calculates simple Haversine distance in meters
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Radius of the earth in m
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

export const routingService = new RoutingService();
export default routingService;
