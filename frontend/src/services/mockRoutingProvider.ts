import type { MapLocation, Route, RoutingProvider } from '../types';

export class MockRoutingProvider implements RoutingProvider {
  async calculateRoutes(
    origin: MapLocation,
    destination: MapLocation,
    vehicleType: 'car' | 'motorcycle' | 'heavy' = 'car'
  ): Promise<Route[]> {
    console.log('[MockRoutingProvider] Simulating offline route calculation...');

    const distanceDirect = this.calculateDirectDistance(origin, destination);
    
    // Generate intermediate path nodes for Safe Route (curves out slightly)
    const safeCoords: MapLocation[] = [
      { lat: origin.lat, lng: origin.lng },
      { lat: origin.lat + (destination.lat - origin.lat) * 0.3 + 0.002, lng: origin.lng + (destination.lng - origin.lng) * 0.3 - 0.002 },
      { lat: origin.lat + (destination.lat - origin.lat) * 0.7 + 0.001, lng: origin.lng + (destination.lng - origin.lng) * 0.7 + 0.002 },
      { lat: destination.lat, lng: destination.lng }
    ];

    // Generate direct path nodes for Alternative Route (shorter, straight)
    const directCoords: MapLocation[] = [
      { lat: origin.lat, lng: origin.lng },
      { lat: origin.lat + (destination.lat - origin.lat) * 0.5, lng: origin.lng + (destination.lng - origin.lng) * 0.5 },
      { lat: destination.lat, lng: destination.lng }
    ];

    // Calculate approximate step distances
    const safeDistance = Math.round(distanceDirect * 1.15);
    const directDistance = Math.round(distanceDirect);

    const safeRoute: Route = {
      id: 'route_safe',
      name: 'Safe Route (Recommended)',
      coords: safeCoords,
      distance: safeDistance,
      duration: Math.round((safeDistance / 11) * 1.2), // ~40 km/h
      safetyScore: 98,
      riskFactors: ['Safe speed limits', 'Avoids school zone congestion'],
      steps: [
        {
          instruction: 'Head north-west on Safe Roadway',
          distance: Math.round(safeDistance * 0.4),
          duration: Math.round((safeDistance * 0.4) / 11),
          startLocation: safeCoords[0],
          endLocation: safeCoords[1]
        },
        {
          instruction: 'Turn right at the junction toward Safe Bypass',
          distance: Math.round(safeDistance * 0.4),
          duration: Math.round((safeDistance * 0.4) / 11),
          startLocation: safeCoords[1],
          endLocation: safeCoords[2]
        },
        {
          instruction: 'Arrive at destination ahead',
          distance: Math.round(safeDistance * 0.2),
          duration: Math.round((safeDistance * 0.2) / 11),
          startLocation: safeCoords[2],
          endLocation: safeCoords[3]
        }
      ],
      activeZones: []
    };

    const directRoute: Route = {
      id: 'route_direct',
      name: 'Direct Route',
      coords: directCoords,
      distance: directDistance,
      duration: Math.round(directDistance / 11), // ~40 km/h
      safetyScore: 72,
      riskFactors: ['Passes through high-enforcement zone', 'Active school zone speeds apply'],
      steps: [
        {
          instruction: 'Proceed direct on Central Highway',
          distance: Math.round(directDistance * 0.6),
          duration: Math.round((directDistance * 0.6) / 11),
          startLocation: directCoords[0],
          endLocation: directCoords[1]
        },
        {
          instruction: 'Continue past speed enforcement cameras to destination',
          distance: Math.round(directDistance * 0.4),
          duration: Math.round((directDistance * 0.4) / 11),
          startLocation: directCoords[1],
          endLocation: directCoords[2]
        }
      ],
      activeZones: []
    };

    return [safeRoute, directRoute];
  }

  private calculateDirectDistance(p1: MapLocation, p2: MapLocation): number {
    const R = 6371000; // Earth's radius in m
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
export default MockRoutingProvider;
