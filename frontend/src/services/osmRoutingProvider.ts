import type { MapLocation, Route, RouteStep, RoutingProvider } from '../types';

export class OSMRoutingProvider implements RoutingProvider {
  async calculateRoutes(
    origin: MapLocation,
    destination: MapLocation,
    vehicleType: 'car' | 'motorcycle' | 'heavy' = 'car'
  ): Promise<Route[]> {
    console.log('[OSMRoutingProvider] Requesting routes from OSRM server...');

    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OSRM API request failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.routes || data.routes.length === 0) {
      throw new Error('No routing pathways found via OSRM');
    }

    const oRoute = data.routes[0];
    
    // Parse geojson coordinates: [[lng, lat], ...]
    const geoCoords: [number, number][] = oRoute.geometry.coordinates;
    const coords: MapLocation[] = geoCoords.map(([lng, lat]) => ({
      lat,
      lng,
    }));

    // Parse routing steps
    const steps: RouteStep[] = [];
    if (oRoute.legs && oRoute.legs[0] && oRoute.legs[0].steps) {
      const legSteps = oRoute.legs[0].steps;
      for (const step of legSteps) {
        // Construct step instruction text
        const type = step.maneuver.type || 'proceed';
        const modifier = step.maneuver.modifier ? ` ${step.maneuver.modifier}` : '';
        const street = step.name ? ` on ${step.name}` : '';
        const instruction = `${type}${modifier}${street} (${Math.round(step.distance)}m)`;

        const startCoords = step.geometry.coordinates[0];
        const endCoords = step.geometry.coordinates[step.geometry.coordinates.length - 1];

        steps.push({
          instruction,
          distance: Math.round(step.distance),
          duration: Math.round(step.duration),
          startLocation: { lat: startCoords[1], lng: startCoords[0] },
          endLocation: { lat: endCoords[1], lng: endCoords[0] },
        });
      }
    }

    // Default safety metrics (to be enriched by routingService check_zones database queries)
    const baseRoute: Route = {
      id: 'route_osm_primary',
      name: 'OSM Standard Route',
      coords,
      distance: Math.round(oRoute.distance),
      duration: Math.round(oRoute.duration),
      safetyScore: 90, // Baseline, will be dynamically modified by routingService
      riskFactors: [],
      steps,
      activeZones: []
    };

    return [baseRoute];
  }
}
export default OSMRoutingProvider;
