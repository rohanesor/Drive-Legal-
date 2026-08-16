/**
 * DriveLegal Offline Service
 *
 * Provides lightweight offline functionality using bundled JSON data
 * and AsyncStorage cache. No Chaquopy, no Python, no FAISS.
 *
 * Offline capabilities:
 * - Penalty lookup by state/violation type
 * - Basic keyword law search
 * - State speed limit defaults
 * - Cached zone data
 * - Emergency contacts
 *
 * NOT available offline:
 * - AI chat (requires backend)
 * - Voice processing (requires backend)
 * - Semantic search (requires FAISS on server)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import PENALTIES_DATA from '../data/penalties.json';
import LAWS_DATA from '../data/laws.json';
import EMERGENCY_DATA from '../data/emergencyContacts.json';
import { DEFAULT_SPEED_LIMITS } from '../constants/speedLimits';

const CACHE_PREFIX = '@drivelegal:cache:';

export interface OfflineQueryResult {
  status: string;
  response?: string;
  laws?: Array<Record<string, unknown>>;
  penalties?: Array<Record<string, unknown>>;
  offline: boolean;
  message?: string;
  [key: string]: unknown;
}

export const offlineService = {
  /**
   * Offline query — keyword search only.
   * AI chat is NOT available offline.
   */
  async queryOffline(text: string, state: string): Promise<OfflineQueryResult> {
    const words = text.toLowerCase().split(/\s+/).filter((w) => w.length >= 3);

    if (words.length === 0) {
      return {
        status: 'offline',
        response: 'Internet connection required for AI assistance. Basic offline search requires at least one keyword with 3+ characters.',
        offline: true,
      };
    }

    // Search laws by keyword
    const matchedLaws = (LAWS_DATA as Array<Record<string, unknown>>).filter((law) => {
      const searchText = `${law.title} ${law.description} ${law.section}`.toLowerCase();
      const stateList = law.states as string[] | undefined;
      const stateMatch = !state || !stateList || stateList.includes(state);
      return stateMatch && words.some((w) => searchText.includes(w));
    }).slice(0, 5);

    // Search penalties
    const matchedPenalties = (PENALTIES_DATA as Array<Record<string, unknown>>).filter((p) => {
      const stateMatch = !state || p.state === state;
      const typeMatch = words.some((w) => {
        const vType = (p.violation_type as string || '').toLowerCase();
        return vType.includes(w) || w.includes(vType.replace('_', ''));
      });
      return stateMatch && typeMatch;
    }).slice(0, 5);

    if (matchedLaws.length === 0 && matchedPenalties.length === 0) {
      return {
        status: 'offline',
        response: 'No matching laws found in offline data. Internet connection required for AI-powered search.',
        offline: true,
      };
    }

    // Build a simple text response from matched data
    let response = '[Offline Mode] ';
    if (matchedLaws.length > 0) {
      const law = matchedLaws[0];
      response += `${law.title} (${law.section}): ${law.description}`;
    }
    if (matchedPenalties.length > 0) {
      const pen = matchedPenalties[0];
      response += ` Fine: ${pen.first_offense} (first offense), ${pen.second_offense} (repeat offense).`;
      if (pen.additional_details) {
        response += ` ${pen.additional_details}`;
      }
    }

    return {
      status: 'offline_result',
      response,
      laws: matchedLaws,
      penalties: matchedPenalties,
      offline: true,
    };
  },

  /**
   * Get penalties offline from bundled data.
   */
  async getPenaltiesOffline(
    state: string,
    violationType?: string,
  ): Promise<OfflineQueryResult> {
    let results = (PENALTIES_DATA as Array<Record<string, unknown>>).filter(
      (p) => p.state === state,
    );

    if (violationType) {
      results = results.filter((p) => p.violation_type === violationType);
    }

    return {
      status: results.length > 0 ? 'offline_result' : 'no_data',
      penalties: results,
      offline: true,
    };
  },

  /**
   * Check zone from cached data.
   */
  async checkZoneOffline(
    lat: number,
    lng: number,
    state: string,
  ): Promise<OfflineQueryResult> {
    try {
      const cached = await AsyncStorage.getItem(`${CACHE_PREFIX}zones:${state}`);
      if (cached) {
        const zones = JSON.parse(cached) as Array<Record<string, unknown>>;
        for (const zone of zones) {
          const cLat = zone.center_lat as number;
          const cLng = zone.center_lng as number;
          const radius = (zone.radius_meters as number) || 500;
          const dist = haversineDistance(lat, lng, cLat, cLng);
          if (dist <= radius) {
            return {
              status: 'zone_alert',
              message: zone.message_template as string,
              offline: true,
            };
          }
        }
      }
    } catch (e) {
      console.warn('Offline zone check error:', e);
    }

    return { status: 'no_zone', offline: true };
  },

  /**
   * Get speed limit from state defaults.
   */
  async getSpeedLimitOffline(
    state: string,
  ): Promise<OfflineQueryResult> {
    const defaults = (DEFAULT_SPEED_LIMITS as any)?.[state];
    if (defaults) {
      return {
        status: 'offline_result',
        response: `Default speed limits for ${state}: City - ${defaults.city || 40} km/h, Highway - ${defaults.highway || 80} km/h, Expressway - ${defaults.expressway || 120} km/h.`,
        offline: true,
      };
    }
    return {
      status: 'offline_result',
      response: 'Default speed limits: City - 40 km/h, Highway - 80 km/h, Expressway - 120 km/h.',
      offline: true,
    };
  },

  /**
   * Cache zone data from a successful server response.
   */
  async cacheZones(state: string, zones: unknown[]): Promise<void> {
    try {
      await AsyncStorage.setItem(`${CACHE_PREFIX}zones:${state}`, JSON.stringify(zones));
    } catch (e) {
      console.warn('Failed to cache zones:', e);
    }
  },

  /**
   * Cache penalties from a successful server response.
   */
  async cachePenalties(state: string, penalties: unknown[]): Promise<void> {
    try {
      await AsyncStorage.setItem(`${CACHE_PREFIX}penalties:${state}`, JSON.stringify(penalties));
    } catch (e) {
      console.warn('Failed to cache penalties:', e);
    }
  },

  /**
   * Get emergency contacts.
   */
  getEmergencyContacts(): Array<Record<string, unknown>> {
    return EMERGENCY_DATA as Array<Record<string, unknown>>;
  },
};

/**
 * Haversine distance in meters between two lat/lng points.
 */
function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
