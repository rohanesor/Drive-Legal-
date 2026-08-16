import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SpeedLimitResult } from '../types/speedLimits';
import { DEFAULT_SPEED_LIMITS, VEHICLE_LIMIT_ADJUSTMENTS, getCategoryFromOsmRoadType } from '../constants/speedLimits';

const CACHE_PREFIX = '@drivelegal:speedlimit:';
const CACHE_TTL_SUCCESS = 30 * 24 * 60 * 60 * 1000; // 30 days
const CACHE_TTL_FALLBACK = 24 * 60 * 60 * 1000;      // 1 day (for defaults, retry sooner)

interface CachedSpeedLimit {
  speedLimit: number;
  source: 'osm' | 'default';
  roadType?: string;
  timestamp: number;
}

export const speedLimitService = {
  /**
   * Rounds lat/lng to 4 decimal places (~11 meters precision) to group queries on the same road segment.
   */
  getCacheKey(lat: number, lng: number): string {
    return `${CACHE_PREFIX}${lat.toFixed(4)}:${lng.toFixed(4)}`;
  },

  /**
   * Retrieves the speed limit for a given location, state, and vehicle type.
   */
  async getSpeedLimit(
    lat: number,
    lng: number,
    stateCode: string,
    vehicleType: string = 'car'
  ): Promise<SpeedLimitResult> {
    if (lat === 0 || lng === 0) {
      return this.getStateDefaultResult(stateCode, undefined, vehicleType);
    }

    const cacheKey = this.getCacheKey(lat, lng);

    try {
      // 1. Check AsyncStorage Cache
      const cachedRaw = await AsyncStorage.getItem(cacheKey);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw) as CachedSpeedLimit;
        const now = Date.now();
        const ttl = cached.source === 'osm' ? CACHE_TTL_SUCCESS : CACHE_TTL_FALLBACK;
        
        if (now - cached.timestamp < ttl) {
          // Adjust for vehicle type on top of cached limit
          const adjustedLimit = this.adjustLimitForVehicle(cached.speedLimit, cached.roadType, vehicleType, stateCode);
          return {
            speedLimit: adjustedLimit,
            source: 'cached',
            roadType: cached.roadType,
            confidence: 'high'
          };
        }
      }

      // 2. Query OSM Overpass API
      const result = await this.queryOsmOverpass(lat, lng);
      
      if (result) {
        // Cache success
        const cacheData: CachedSpeedLimit = {
          speedLimit: result.speedLimit,
          source: 'osm',
          roadType: result.roadType,
          timestamp: Date.now()
        };
        await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));

        // Adjust for vehicle type
        const adjustedLimit = this.adjustLimitForVehicle(result.speedLimit, result.roadType, vehicleType, stateCode);
        return {
          speedLimit: adjustedLimit,
          source: 'osm',
          roadType: result.roadType,
          confidence: 'high'
        };
      }

      // 3. Fallback to state defaults if OSM fails/has no tags
      const fallbackResult = this.getStateDefaultResult(stateCode, undefined, vehicleType);
      
      // Cache fallback for a shorter period
      const fallbackCacheData: CachedSpeedLimit = {
        speedLimit: fallbackResult.speedLimit,
        source: 'default',
        roadType: undefined,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(fallbackCacheData));

      return {
        ...fallbackResult,
        source: 'default'
      };

    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      console.warn('[SpeedLimitService] lookup error, falling back to defaults:', err.message);
      
      return {
        ...this.getStateDefaultResult(stateCode, undefined, vehicleType),
        source: 'default'
      };
    }
  },

  /**
   * Helper to query Overpass Interpreter API for ways containing a highway tag.
   */
  async queryOsmOverpass(lat: number, lng: number): Promise<{ speedLimit: number; roadType: string } | null> {
    try {
      const query = `[out:json][timeout:5];way(around:50,${lat},${lng})["highway"];out tags;`;
      const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

      console.log(`[SpeedLimitService] Querying OSM: ${url}`);
      const response = await fetch(url, {
        headers: { 'User-Agent': 'DriveLegal/1.2' },
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      const elements = data.elements || [];

      if (elements.length === 0) {
        return null;
      }

      // Pick the first way element containing road info
      const way = elements[0];
      const tags = way.tags || {};
      const maxspeedTag = tags.maxspeed;
      const roadType = tags.highway || 'residential';

      let speedLimit = 0;

      if (maxspeedTag) {
        speedLimit = this.parseMaxspeedTag(maxspeedTag);
      }

      // If maxspeed is missing or invalid, map from roadType default limits (national defaults)
      if (speedLimit <= 0) {
        const category = getCategoryFromOsmRoadType(roadType);
        const defaults = DEFAULT_SPEED_LIMITS.DEFAULT;
        speedLimit = defaults[category] || 50;
      }

      return {
        speedLimit,
        roadType
      };

    } catch (error) {
      console.warn('[SpeedLimitService] Overpass API request failed:', error);
      return null;
    }
  },

  /**
   * Parses various formats of maxspeed tag (e.g. "50", "80 km/h", "30 mph", "urban", "IN:urban").
   */
  parseMaxspeedTag(tag: string): number {
    const cleanTag = tag.trim().toLowerCase();
    
    // Check if in mph
    const isMph = cleanTag.includes('mph');
    
    // Extract first number
    const match = cleanTag.match(/\d+/);
    if (match) {
      const val = parseInt(match[0], 10);
      if (isMph) {
        // Convert to km/h and round to nearest 5
        return Math.round((val * 1.609) / 5) * 5;
      }
      return val;
    }

    // Handles implicit speed limit text tags
    if (cleanTag.includes('urban')) return 50;
    if (cleanTag.includes('rural')) return 80;
    if (cleanTag.includes('motorway')) return 120;

    return 0;
  },

  /**
   * Adjusts a base speed limit according to the vehicle type and state regulations.
   */
  adjustLimitForVehicle(baseLimit: number, roadType: string | undefined, vehicleType: string, stateCode: string): number {
    const category = getCategoryFromOsmRoadType(roadType);
    const adjustments = VEHICLE_LIMIT_ADJUSTMENTS[vehicleType] || VEHICLE_LIMIT_ADJUSTMENTS.car;
    const diff = adjustments[category] || 0;
    
    const finalLimit = baseLimit + diff;
    return Math.max(20, finalLimit); // Minimum safety limit fallback of 20 km/h
  },

  /**
   * Helper to return standard state defaults.
   */
  getStateDefaultResult(stateCode: string, roadType?: string, vehicleType: string = 'car'): SpeedLimitResult {
    const code = stateCode ? stateCode.toUpperCase() : 'DEFAULT';
    const defaults = DEFAULT_SPEED_LIMITS[code] || DEFAULT_SPEED_LIMITS.DEFAULT;
    const category = getCategoryFromOsmRoadType(roadType);
    
    const baseLimit = defaults[category] || defaults.urban;
    const adjustments = VEHICLE_LIMIT_ADJUSTMENTS[vehicleType] || VEHICLE_LIMIT_ADJUSTMENTS.car;
    const diff = adjustments[category] || 0;

    return {
      speedLimit: Math.max(20, baseLimit + diff),
      source: 'default',
      roadType,
      confidence: 'medium'
    };
  }
};
