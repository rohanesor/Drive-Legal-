import { MapProvider } from '../../frontend/src/modules/navigation/MapProvider';
import { MapCache } from '../../frontend/src/modules/navigation/MapCache';
import { MapMatchingEngine } from '../../frontend/src/modules/navigation/MapMatchingEngine';
import { RouteEngine } from '../../frontend/src/modules/navigation/RouteEngine';
import { NavigationStateMachine } from '../../frontend/src/modules/navigation/NavigationStateMachine';

describe('Navigation & Map Intelligence Layer (P1.4)', () => {
  let provider: MapProvider;
  let cache: MapCache;
  let matchingEngine: MapMatchingEngine;
  let routeEngine: RouteEngine;
  let stateMachine: NavigationStateMachine;

  beforeEach(() => {
    provider = new MapProvider('ONLINE');
    cache = new MapCache();
    matchingEngine = new MapMatchingEngine(provider);
    routeEngine = new RouteEngine(provider);
    stateMachine = new NavigationStateMachine();
  });

  test('1. Map matching associates heading parameters to segments', () => {
    const loc = { latitude: 11.0168, longitude: 76.9558 };
    
    // Heading pointing toward Avinashi Road
    const resAvinashi = matchingEngine.match(loc, 90);
    expect(resAvinashi.segmentId).toBe('seg_avinashi_road');
    expect(resAvinashi.confidence).toBeCloseTo(0.95, 2);

    // Heading pointing toward Cross Cut Road
    const resCrossCut = matchingEngine.match(loc, 270);
    expect(resCrossCut.segmentId).toBe('seg_cross_cut_road');
    expect(resCrossCut.confidence).toBeCloseTo(0.9, 2);
  });

  test('2. GPS noise handles missing heading gracefully', () => {
    const loc = { latitude: 11.0168, longitude: 76.9558 };
    const res = matchingEngine.match(loc); // undefined heading
    expect(res.segmentId).toBe('seg_avinashi_road'); // defaults to closest road segment
    expect(res.confidence).toBe(0.7); // standard baseline proximity confidence
  });

  test('3. Road segment selection retrieves structured properties', () => {
    const seg = provider.getRoadSegment({ latitude: 11.0, longitude: 76.9 });
    expect(seg.roadName).toBe('Avinashi Road');
    expect(seg.lanes).toBe(4);
    expect(seg.oneWay).toBe(false);
  });

  test('4. Speed limit context maps verified sources', () => {
    const speedLimitCtx = provider.getSpeedLimit('seg_avinashi_road');
    expect(speedLimitCtx.value).toBe(80);
    expect(speedLimitCtx.source).toBe('VERIFIED_DATA');
    expect(speedLimitCtx.confidence).toBe(0.98);
  });

  test('5. Restriction handling defines road segment limits', () => {
    const restrictions = provider.getRoadRestrictions('seg_avinashi_road');
    expect(restrictions.length).toBe(2);
    expect(restrictions[0].type).toBe('NO_ENTRY');
    expect(restrictions[0].status).toBe('SUPPORTED');
  });

  test('6. Route alternatives construction ranks safety and distance', () => {
    const alternatives = routeEngine.calculateRouteAlternatives(
      { latitude: 11.01, longitude: 76.95 },
      { latitude: 11.02, longitude: 76.96 }
    );

    expect(alternatives.FASTEST.id).toBe('route_fastest');
    expect(alternatives.SAFEST.id).toBe('route_safest');
    expect(alternatives.BALANCED.id).toBe('route_balanced');

    expect(alternatives.SAFEST.safetyScore).toBeGreaterThan(alternatives.FASTEST.safetyScore);
    expect(alternatives.FASTEST.duration).toBeLessThan(alternatives.SAFEST.duration);
  });

  test('7. Legal hard constraints penalize routing score', () => {
    const baseAlternatives = routeEngine.calculateRouteAlternatives(
      { latitude: 11.01, longitude: 76.95 },
      { latitude: 11.02, longitude: 76.96 },
      { vehicleHeightMeters: 4.2 } // vehicle height exceeds normal restrictions (3.5m)
    );

    expect(baseAlternatives.FASTEST.legalScore).toBe(0); // restricted!
  });

  test('8. Soft preferences adjust toll costs', () => {
    const avoidTollAlternatives = routeEngine.calculateRouteAlternatives(
      { latitude: 11.01, longitude: 76.95 },
      { latitude: 11.02, longitude: 76.96 },
      { avoidTolls: true }
    );

    expect(avoidTollAlternatives.FASTEST.tollCost).toBe(0); // toll cost cleared
  });

  test('9. Route deviation state transitions', () => {
    const alternatives = routeEngine.calculateRouteAlternatives(
      { latitude: 11.01, longitude: 76.95 },
      { latitude: 11.02, longitude: 76.96 }
    );

    stateMachine.selectRoute(alternatives.FASTEST);
    stateMachine.startNavigation();
    expect(stateMachine.getCurrentState()).toBe('NAVIGATING');

    // Deviate (distance = 60m > 50m threshold)
    stateMachine.updatePosition({ latitude: 11.0, longitude: 76.9 }, 60);
    expect(stateMachine.getCurrentState()).toBe('DEVIATED');
  });

  test('10. Rerouting debounce triggers REROUTING after consecutive deviated counts', () => {
    const alternatives = routeEngine.calculateRouteAlternatives(
      { latitude: 11.01, longitude: 76.95 },
      { latitude: 11.02, longitude: 76.96 }
    );

    stateMachine.selectRoute(alternatives.FASTEST);
    stateMachine.startNavigation();

    // Dev 1: Transition to DEVIATED
    stateMachine.updatePosition({ latitude: 11.0, longitude: 76.9 }, 65);
    expect(stateMachine.getCurrentState()).toBe('DEVIATED');

    // Dev 2: Transition to REROUTING
    stateMachine.updatePosition({ latitude: 11.0, longitude: 76.9 }, 65);
    expect(stateMachine.getCurrentState()).toBe('REROUTING');
  });

  test('11. Navigation state machine transitions IDLE -> SELECTED -> NAVIGATING -> DEVIATED -> REROUTING -> ARRIVED', () => {
    const alternatives = routeEngine.calculateRouteAlternatives(
      { latitude: 11.01, longitude: 76.95 },
      { latitude: 11.02, longitude: 76.96 }
    );

    expect(stateMachine.getCurrentState()).toBe('IDLE');

    stateMachine.selectRoute(alternatives.FASTEST);
    expect(stateMachine.getCurrentState()).toBe('ROUTE_SELECTED');

    stateMachine.startNavigation();
    expect(stateMachine.getCurrentState()).toBe('NAVIGATING');

    stateMachine.updatePosition({ latitude: 11.0, longitude: 76.9 }, 65); // 1 tick
    stateMachine.updatePosition({ latitude: 11.0, longitude: 76.9 }, 65); // 2 ticks
    expect(stateMachine.getCurrentState()).toBe('REROUTING');

    stateMachine.completeReroute(alternatives.SAFEST);
    expect(stateMachine.getCurrentState()).toBe('NAVIGATING');

    stateMachine.arrive();
    expect(stateMachine.getCurrentState()).toBe('ARRIVED');
  });

  test('12. Turn-by-turn instruction maneuver generation list is valid', () => {
    const instructions = stateMachine.getInstructions();
    expect(instructions.length).toBe(2);
    expect(instructions[0].type).toBe('TURN_LEFT');
    expect(instructions[1].type).toBe('ARRIVE');
  });

  test('13. Offline mode degrades confidence parameters', () => {
    provider.setMode('OFFLINE');
    const seg = provider.getRoadSegment({ latitude: 11.0, longitude: 76.9 });
    expect(seg.confidence).toBe(0.7);

    const speedLimitCtx = provider.getSpeedLimit('seg_avinashi_road');
    expect(speedLimitCtx.confidence).toBe(0.8);
  });

  test('14. Cache layer obeys TTL and expires entries', async () => {
    const routeKey = 'route_cached_1';
    const mockRoute = { id: 'cached_route', distance: 1000 };

    cache.set(routeKey, mockRoute, 50); // short TTL 50ms
    expect(cache.get(routeKey)).toBeDefined();

    // Await TTL expiration
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(cache.get(routeKey)).toBeNull(); // expired
  });

  test('15. EV context calculates start and end battery depletion percentages', () => {
    const alternatives = routeEngine.calculateRouteAlternatives(
      { latitude: 11.01, longitude: 76.95 },
      { latitude: 11.02, longitude: 76.96 }
    );

    const evCtx = routeEngine.buildEVContext(alternatives.FASTEST, 10);
    expect(evCtx.batteryAtStart).toBe(10);
    expect(evCtx.estimatedBatteryAtDestination).toBeLessThan(10);
    expect(evCtx.requiredCharging).toBe(true); // low end battery percent triggers charge stops
  });
});
