import { Route, EVRouteContext } from './types';
import { MapProvider } from './MapProvider';
import { LegalComplianceEngine } from '../legal/LegalComplianceEngine';
import { RiskEngine } from '../risk/RiskEngine';

export class RouteEngine {
  private mapProvider: MapProvider;
  private legalEngine: LegalComplianceEngine;
  private riskEngine: RiskEngine;

  constructor(mapProvider: MapProvider) {
    this.mapProvider = mapProvider;
    this.legalEngine = new LegalComplianceEngine();
    this.riskEngine = new RiskEngine();
  }

  /**
   * Generates candidate routes comparing safety, time weights, and legal constraints.
   */
  calculateRouteAlternatives(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
    options: {
      vehicleWeightKg?: number;
      vehicleHeightMeters?: number;
      batteryLevelPercent?: number;
      avoidTolls?: boolean;
    } = {}
  ): { FASTEST: Route; SAFEST: Route; BALANCED: Route } {
    const mainSegment = this.mapProvider.getRoadSegment(origin);
    const crossSegment = this.mapProvider.getNearbyRoads(origin)[1];

    const legalPenaltyFastest = options.vehicleHeightMeters && options.vehicleHeightMeters > 3.5 ? 9999 : 0;

    const routeFastest: Route = {
      id: 'route_fastest',
      origin,
      destination,
      segments: [mainSegment],
      distance: 3000,
      duration: 1320, // 22 min
      eta: Date.now() + 1320 * 1000,
      tollCost: options.avoidTolls ? 0 : 50,
      safetyScore: 70,
      legalScore: legalPenaltyFastest > 0 ? 0 : 95,
      riskScore: 42,
      confidence: 0.95,
      provider: 'MockMapEngine',
    };

    const routeSafest: Route = {
      id: 'route_safest',
      origin,
      destination,
      segments: [crossSegment],
      distance: 4000,
      duration: 1620, // 27 min
      eta: Date.now() + 1620 * 1000,
      tollCost: 0,
      safetyScore: 95,
      legalScore: 100,
      riskScore: 17,
      confidence: 0.9,
      provider: 'MockMapEngine',
    };

    const routeBalanced: Route = {
      id: 'route_balanced',
      origin,
      destination,
      segments: [mainSegment, crossSegment],
      distance: 3500,
      duration: 1440, // 24 min
      eta: Date.now() + 1440 * 1000,
      tollCost: options.avoidTolls ? 0 : 25,
      safetyScore: 85,
      legalScore: 100,
      riskScore: 25,
      confidence: 0.92,
      provider: 'MockMapEngine',
    };

    return {
      FASTEST: routeFastest,
      SAFEST: routeSafest,
      BALANCED: routeBalanced,
    };
  }

  buildEVContext(route: Route, batteryLevelPercent: number): EVRouteContext {
    const efficiencyWhPerKm = 180;
    const distanceKm = route.distance / 1000;
    const whUsed = distanceKm * efficiencyWhPerKm;
    
    const batteryCapacityWh = 75000;
    const WhAvailable = batteryCapacityWh * (batteryLevelPercent / 100);
    const remainingWh = WhAvailable - whUsed;
    const remainingPercent = Math.max(0, Math.round((remainingWh / batteryCapacityWh) * 100));

    return {
      batteryAtStart: batteryLevelPercent,
      estimatedBatteryAtDestination: remainingPercent,
      requiredCharging: remainingPercent < 10,
      chargingStops: remainingPercent < 10 ? 1 : 0,
      confidence: 0.85,
    };
  }
}
export default RouteEngine;
