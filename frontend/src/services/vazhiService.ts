/**
 * Vazhi Application Service
 *
 * The ONLY service that screens should import.
 * Routes requests through online (apiService) or offline (offlineService)
 * based on current connection status.
 *
 * Screens must NOT directly import apiService or offlineService.
 */
import { apiService, QueryResponse, ZoneCheckResponse } from './apiService';
import { offlineService, OfflineQueryResult } from './offlineService';
import { connectionManager } from './connectionManager';

export type ServiceResponse = {
  status: string;
  response?: string;
  laws?: Array<Record<string, unknown>>;
  penalties?: Array<Record<string, unknown>>;
  message?: string;
  offline: boolean;
  zone_type?: string;
  zone_name?: string;
  suggested_query?: string;
  severity?: string;
  [key: string]: unknown;
};

export const vazhiService = {
  /**
   * Send a query — routes to server or offline fallback.
   */
  async query(
    text: string,
    state: string,
    language: string = 'en',
    location?: { lat: number; lng: number },
    history?: Array<{ role: string; content: string }>,
    navigationContext?: Record<string, unknown>,
  ): Promise<ServiceResponse> {
    if (connectionManager.isOnline()) {
      try {
        const result = await apiService.query(text, state, language, location, history, navigationContext);
        return { ...result, offline: false };
      } catch {
        // Fall through to offline
      }
    }

    return offlineService.queryOffline(text, state);
  },

  /**
   * Check zone — routes to server or cached offline data.
   */
  async zoneCheck(
    lat: number,
    lng: number,
    state: string,
    heading?: number | null,
    speed?: number,
  ): Promise<ServiceResponse> {
    if (connectionManager.isOnline()) {
      try {
        const result: ZoneCheckResponse = await apiService.zoneCheck(lat, lng, state, heading, speed);
        return { ...result, offline: false };
      } catch {
        // Fall through to offline
      }
    }

    return offlineService.checkZoneOffline(lat, lng, state);
  },

  /**
   * Get penalties — works both online and offline.
   */
  async getPenalties(
    state: string,
    violationType?: string,
  ): Promise<ServiceResponse> {
    if (connectionManager.isOnline()) {
      try {
        const result = await apiService.getPenalties(state, violationType);
        // Cache for offline use
        if (result.penalties) {
          offlineService.cachePenalties(state, result.penalties as unknown[]);
        }
        return { ...result, offline: false };
      } catch {
        // Fall through to offline
      }
    }

    return offlineService.getPenaltiesOffline(state, violationType);
  },

  /**
   * Get speed limit — online or offline defaults.
   */
  async getSpeedLimit(
    lat: number,
    lng: number,
    state: string,
  ): Promise<ServiceResponse> {
    if (connectionManager.isOnline()) {
      try {
        const result = await apiService.getSpeedLimit(lat, lng, state);
        return { ...result, offline: false };
      } catch {
        // Fall through to offline
      }
    }

    return offlineService.getSpeedLimitOffline(state);
  },

  /**
   * Get connection status.
   */
  getConnectionStatus() {
    return connectionManager.getStatus();
  },

  /**
   * Subscribe to connection changes.
   */
  onConnectionChange(listener: (status: string) => void): () => void {
    return connectionManager.subscribe(listener);
  },

  async compareRoutes(origin: [number, number], destination: [number, number]): Promise<any> {
    return apiService.compareRoutes(origin, destination);
  },

  async explainRoute(routeData: any): Promise<any> {
    return apiService.explainRoute(routeData);
  },
};

// Backward compatibility alias
export const driveLegalService = vazhiService;
