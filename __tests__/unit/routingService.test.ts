import { routingService } from '../../frontend/src/services/routingService';
import { checkZones } from '../../frontend/src/services/pythonBridge';

// Mock PythonBridge checkZones
jest.mock('../../frontend/src/services/pythonBridge', () => ({
  checkZones: jest.fn()
}));

// Mock speedLimitService
jest.mock('../../frontend/src/services/speedLimitService', () => ({
  speedLimitService: {
    getSpeedLimit: jest.fn().mockResolvedValue({
      speedLimit: 60,
      source: 'osm',
      confidence: 'high'
    })
  }
}));

describe('RoutingService Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('should calculate route, falling back to mock provider if network is offline', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
    (checkZones as jest.Mock).mockResolvedValue({ status: 'no_alert' });

    const origin = { lat: 11.0168, lng: 76.9558 };
    const destination = { lat: 11.0200, lng: 76.9600 };

    const routes = await routingService.calculateRoutes({
      origin,
      destination,
      vehicleType: 'car',
    });

    expect(routes).toBeDefined();
    expect(routes.length).toBe(2);
    expect(routes[0].id).toBe('route_safe');
    expect(routes[1].id).toBe('route_direct');
  });

  it('should apply safety deduction if route passes through hazard zone', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network offline'));
    
    // Simulate checkZones returning an accident zone warning on query
    (checkZones as jest.Mock).mockResolvedValue({
      status: 'zone_alert',
      zone_name: 'Avinashi Road Hotspot',
      zone_type: 'accident_zone',
      message: 'High accident rates registered'
    });

    const origin = { lat: 11.0168, lng: 76.9558 };
    const destination = { lat: 11.0200, lng: 76.9600 };

    const routes = await routingService.calculateRoutes({
      origin,
      destination,
      vehicleType: 'car',
    });

    const safeRoute = routes[0];
    // Safety score should be reduced from 98 because of the mock checkZones responses
    expect(safeRoute.safetyScore).toBeLessThan(98);
    expect(safeRoute.riskFactors.some(r => r.toLowerCase().includes('accident-prone zone'))).toBe(true);
  });

  it('should generate structured SafetyAssessment metrics', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network offline'));
    (checkZones as jest.Mock).mockResolvedValue({
      status: 'zone_alert',
      zone_name: 'Airport School Zone',
      zone_type: 'school_zone',
      message: 'Reduced speed mandatory'
    });

    const origin = { lat: 11.0168, lng: 76.9558 };
    const destination = { lat: 11.0200, lng: 76.9600 };

    const routes = await routingService.calculateRoutes({
      origin,
      destination,
      vehicleType: 'car',
    });

    const safeRoute = routes[0];
    expect(safeRoute.safety).toBeDefined();
    expect(safeRoute.safety?.score).toBe(95); // 100 - 5 (school_zone)
    expect(safeRoute.safety?.confidence).toBe('high');
    expect(safeRoute.safety?.factors.schoolZonesCount).toBe(1);
    expect(safeRoute.safety?.factors.speedLimitStatus).toBe('known');
    expect(safeRoute.safety?.factors.speedLimitCompatibility).toBe('compatible');
    expect(safeRoute.safety?.dataSources).toContain('osm_overpass');
    expect(safeRoute.safety?.status).toBe('KNOWN');
  });

  it('should compute haversine distance correctly', () => {
    const coimbatore1 = { lat: 11.0168, lng: 76.9558 };
    const coimbatore2 = { lat: 11.0168, lng: 76.9558 }; // Same point
    
    const distanceSame = routingService.calculateDistance(
      coimbatore1.lat,
      coimbatore1.lng,
      coimbatore2.lat,
      coimbatore2.lng
    );
    expect(distanceSame).toBe(0);

    // Known distance: Coimbatore to Chennai is ~420km (420000m)
    const chennai = { lat: 13.0827, lng: 80.2707 };
    const distanceChennai = routingService.calculateDistance(
      coimbatore1.lat,
      coimbatore1.lng,
      chennai.lat,
      chennai.lng
    );
    expect(distanceChennai).toBeGreaterThan(400000);
    expect(distanceChennai).toBeLessThan(450000);
  });
});
