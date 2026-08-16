import type { MapLocation, Route } from './index';

export interface RoutingProvider {
  calculateRoutes(
    origin: MapLocation,
    destination: MapLocation,
    vehicleType?: 'car' | 'motorcycle' | 'heavy'
  ): Promise<Route[]>;
}
