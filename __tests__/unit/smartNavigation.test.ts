import { NavigationEngine } from '../../frontend/src/modules/smart-navigation/NavigationEngine';
import { RouteCostEngine } from '../../frontend/src/modules/smart-navigation/RouteCostEngine';
import { RouteDeviationDetector } from '../../frontend/src/modules/smart-navigation/RouteDeviationDetector';
import { NavigationExplanationEngine } from '../../frontend/src/modules/smart-navigation/NavigationExplanationEngine';
import { RouteRequest, RouteSegment } from '../../frontend/src/modules/smart-navigation/types';

describe('Smart Navigation & Route Intelligence Engine (P2.11)', () => {
  let navEngine: NavigationEngine;
  let request: RouteRequest;

  beforeEach(() => {
    navEngine = new NavigationEngine();
    request = {
      origin: 'Point A',
      destination: 'Point B',
      preferences: 'BALANCED',
      vehicleProfile: {
        vehicleDimensions: { height: 2.5, width: 2.0, length: 5.0 }, // 2.5m height
      },
    };
  });

  test('1. NavigationEngine calculates candidate routes and enforces height constraints', () => {
    // Height 2.5m -> both Highway (no restrictions) and Residential (MAX_HEIGHT_3M) routes are candidate options
    const candidatesNormal = navEngine.calculateRouteCandidates(request);
    expect(candidatesNormal.length).toBe(2);

    // Height 4.0m -> Residential route (MAX_HEIGHT_3M) must be excluded!
    request.vehicleProfile!.vehicleDimensions!.height = 4.0;
    const candidatesConstrained = navEngine.calculateRouteCandidates(request);
    expect(candidatesConstrained.length).toBe(1);
    expect(candidatesConstrained[0].routeId).toBe('rt_candidate_a'); // only Highway is returned
  });

  test('2. RouteCostEngine aggregates segment costs with constraints penalty', () => {
    const segment: RouteSegment = {
      segmentId: 'seg_1',
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

    const costNormal = RouteCostEngine.calculateSegmentCost(segment, request, {
      distanceWeight: 1.0,
      durationWeight: 1.0,
      riskWeight: 1.0,
    });

    // Request with avoidRestrictedRoads constraint -> adds 5000 penalty units
    const constrainedRequest: RouteRequest = {
      ...request,
      constraints: { avoidRestrictedRoads: true },
    };
    const costPenalty = RouteCostEngine.calculateSegmentCost(segment, constrainedRequest, {
      distanceWeight: 1.0,
      durationWeight: 1.0,
      riskWeight: 1.0,
    });

    expect(costPenalty).toBe(costNormal + 5000);
  });

  test('3. RouteDeviationDetector transitions states across thresholds', () => {
    const detector = new RouteDeviationDetector();

    // 1st update: 60m away -> POSSIBLE_DEVIATION
    expect(detector.detectDeviation(60)).toBe('POSSIBLE_DEVIATION');

    // 2nd update: 60m away -> POSSIBLE_DEVIATION
    expect(detector.detectDeviation(60)).toBe('POSSIBLE_DEVIATION');

    // 3rd update: 60m away -> OFF_ROUTE
    expect(detector.detectDeviation(60)).toBe('OFF_ROUTE');

    // Reset update: 10m away -> ON_ROUTE
    expect(detector.detectDeviation(10)).toBe('ON_ROUTE');
  });

  test('4. NavigationEngine enforces reroute cooldown interval', () => {
    // 1st reroute -> success
    const res1 = navEngine.requestReroute(request);
    expect(res1).toBe(true);

    // Immediate 2nd reroute request -> ignored due to cooldown
    const res2 = navEngine.requestReroute(request);
    expect(res2).toBe(false);
  });

  test('5. NavigationExplanationEngine generates correct selection explanations', () => {
    const candidates = navEngine.calculateRouteCandidates(request);
    const selected = candidates[0];
    const alternative = candidates[1];

    const explanation = NavigationExplanationEngine.explainRouteSelection(selected, alternative);
    expect(explanation).toContain('minutes faster');
  });
});
