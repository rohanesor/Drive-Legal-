jest.mock('@react-native-async-storage/async-storage', () => {
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    }
  };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { speedLimitService } from '../../frontend/src/services/speedLimitService';

describe('SpeedLimitService Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe('parseMaxspeedTag', () => {
    it('should parse standard number strings', () => {
      expect(speedLimitService.parseMaxspeedTag('50')).toBe(50);
      expect(speedLimitService.parseMaxspeedTag('80 km/h')).toBe(80);
      expect(speedLimitService.parseMaxspeedTag(' 100  ')).toBe(100);
    });

    it('should parse mph tags and convert to km/h', () => {
      expect(speedLimitService.parseMaxspeedTag('30 mph')).toBe(50);
      expect(speedLimitService.parseMaxspeedTag('60 mph')).toBe(95);
    });

    it('should fall back to standard defaults for text tags', () => {
      expect(speedLimitService.parseMaxspeedTag('IN:urban')).toBe(50);
      expect(speedLimitService.parseMaxspeedTag('rural')).toBe(80);
      expect(speedLimitService.parseMaxspeedTag('IN:motorway')).toBe(120);
    });

    it('should return 0 for invalid inputs', () => {
      expect(speedLimitService.parseMaxspeedTag('unknown')).toBe(0);
      expect(speedLimitService.parseMaxspeedTag('')).toBe(0);
    });
  });

  describe('getStateDefaultResult', () => {
    it('should return correct defaults for Tamil Nadu', () => {
      const res = speedLimitService.getStateDefaultResult('TN', 'primary', 'car');
      expect(res.speedLimit).toBe(100); // Highway default
      expect(res.source).toBe('default');
    });

    it('should return correct defaults for Kerala', () => {
      const res = speedLimitService.getStateDefaultResult('KL', 'primary', 'car');
      expect(res.speedLimit).toBe(85); // Kerala highway limit is 85
    });

    it('should adjust defaults for different vehicle types', () => {
      const resMotorcycle = speedLimitService.getStateDefaultResult('TN', 'primary', 'motorcycle');
      expect(resMotorcycle.speedLimit).toBe(80);

      const resHeavy = speedLimitService.getStateDefaultResult('TN', 'motorway', 'heavy');
      expect(resHeavy.speedLimit).toBe(80);
    });
  });

  describe('getSpeedLimit caching & fetch', () => {
    it('should return cached value if present and within TTL', async () => {
      const cachedData = {
        speedLimit: 60,
        source: 'osm',
        roadType: 'primary',
        timestamp: Date.now() - 1000
      };
      
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cachedData));

      const res = await speedLimitService.getSpeedLimit(11.0168, 76.9558, 'TN', 'car');
      
      expect(res.speedLimit).toBe(60);
      expect(res.source).toBe('cached');
      expect(res.roadType).toBe('primary');
      expect(AsyncStorage.getItem).toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should query OSM Overpass on cache miss and write to cache', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const mockOsmResponse = {
        elements: [
          {
            type: 'way',
            id: 12345,
            tags: {
              highway: 'primary',
              maxspeed: '80'
            }
          }
        ]
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockOsmResponse,
      });

      const res = await speedLimitService.getSpeedLimit(11.0168, 76.9558, 'TN', 'car');

      expect(res.speedLimit).toBe(80);
      expect(res.source).toBe('osm');
      expect(res.roadType).toBe('primary');
      expect(global.fetch).toHaveBeenCalled();
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should fall back to state defaults on fetch error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const res = await speedLimitService.getSpeedLimit(11.0168, 76.9558, 'TN', 'car');

      expect(res.speedLimit).toBe(50); // TN urban car fallback limit
      expect(res.source).toBe('default');
    });
  });
});
