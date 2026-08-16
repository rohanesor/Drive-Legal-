import { Route, RouteRequest, RouteSegment, TurnInstruction, CriticalRouteSegment } from './types';
import { RouteCostEngine } from './RouteCostEngine';

export class NavigationEngine {
  private lastRerouteTime = 0;
  private rerouteCooldownMs = 5000;
  private currentRoute: Route | null = null;

  calculateRouteCandidates(request: RouteRequest): Route[] {
    const segment1: RouteSegment = {
      segmentId: 'seg_1',
      roadId: 'rd_highway_1',
      roadName: 'Highway-101',
      roadClass: 'HIGHWAY',
      distanceMeters: 2000,
      estimatedDuration: 120,
      restrictions: [],
      zones: [],
      hazards: [],
      risk: 0.1,
      legalStatus: 'LEGAL',
      confidence: 0.95,
    };

    const segment2: RouteSegment = {
      segmentId: 'seg_2',
      roadId: 'rd_residential_1',
      roadName: 'Main St',
      roadClass: 'RESIDENTIAL',
      distanceMeters: 1000,
      estimatedDuration: 180,
      restrictions: ['MAX_HEIGHT_3M'],
      zones: [],
      hazards: [],
      risk: 0.2,
      legalStatus: 'LEGAL',
      confidence: 0.9,
    };

    const legA = {
      legId: 'leg_a',
      start: { latitude: 11.0, longitude: 76.9 },
      end: { latitude: 11.05, longitude: 76.95 },
      segments: [segment1],
      distanceMeters: 2000,
      durationSeconds: 120,
    };

    const costA = RouteCostEngine.calculateSegmentCost(segment1, request, {
      distanceWeight: 1.0,
      durationWeight: 1.0,
      riskWeight: 1.0,
    });

    const routeA: Route = {
      routeId: 'rt_candidate_a',
      origin: request.origin,
      destination: request.destination,
      distanceMeters: 2000,
      durationSeconds: 120,
      segments: [segment1],
      legs: [legA],
      legalStatus: 'VALID',
      riskAssessment: { riskScore: 0.1 },
      score: {
        total: costA,
        travelCost: costA,
        riskCost: segment1.risk * 10,
        legalCost: 0,
        restrictionCost: 0,
        preferenceCost: 0,
      },
      confidence: 0.95,
      mapVersion: 'IN-2026-07',
      routeEngineVersion: '1.0.0',
      createdAt: Date.now(),
    };

    const legB = {
      legId: 'leg_b',
      start: { latitude: 11.0, longitude: 76.9 },
      end: { latitude: 11.05, longitude: 76.95 },
      segments: [segment2],
      distanceMeters: 1000,
      durationSeconds: 180,
    };

    const costB = RouteCostEngine.calculateSegmentCost(segment2, request, {
      distanceWeight: 1.0,
      durationWeight: 1.0,
      riskWeight: 1.0,
    });

    const routeB: Route = {
      routeId: 'rt_candidate_b',
      origin: request.origin,
      destination: request.destination,
      distanceMeters: 1000,
      durationSeconds: 180,
      segments: [segment2],
      legs: [legB],
      legalStatus: 'VALID',
      riskAssessment: { riskScore: 0.2 },
      score: {
        total: costB,
        travelCost: costB,
        riskCost: segment2.risk * 10,
        legalCost: 0,
        restrictionCost: segment2.restrictions.length > 0 ? 500 : 0,
        preferenceCost: 0,
      },
      confidence: 0.9,
      mapVersion: 'IN-2026-07',
      routeEngineVersion: '1.0.0',
      createdAt: Date.now(),
    };

    const candidates = [routeA, routeB];
    const profileHeight = request.vehicleProfile?.vehicleDimensions?.height || 0;

    return candidates.filter((route) => {
      return !route.segments.some((seg) => {
        return (
          seg.restrictions.includes('MAX_HEIGHT_3M') &&
          profileHeight > 3
        );
      });
    });
  }

  getCurrentRoute(): Route | null {
    return this.currentRoute;
  }

  setCurrentRoute(route: Route): void {
    this.currentRoute = route;
  }

  requestReroute(request: RouteRequest): boolean {
    const elapsed = Date.now() - this.lastRerouteTime;
    if (elapsed < this.rerouteCooldownMs) {
      console.warn('[NavigationEngine] Reroute request ignored due to cooldown protection active.');
      return false;
    }

    const candidates = this.calculateRouteCandidates(request);
    if (candidates.length > 0) {
      this.currentRoute = candidates[0];
      this.lastRerouteTime = Date.now();
      return true;
    }
    return false;
  }
}
export default NavigationEngine;
