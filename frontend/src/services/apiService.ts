/**
 * DriveLegal API Service
 *
 * Centralized HTTP client for the DriveLegal backend.
 * All requests go through POST /query with an action field,
 * except health checks which use GET /health.
 *
 * Implements:
 * - AbortController timeout (15s)
 * - Bounded exponential backoff (max 2 retries)
 * - Retry only on network errors and 5xx
 * - X-Request-ID header for traceability
 * - Structured error types
 * - JSON validation
 */
import { CONFIG } from '../config';

// --- Error Types ---

export class ApiError extends Error {
  constructor(message: string, public readonly type: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends ApiError {
  constructor(message: string = 'Network request failed') {
    super(message, 'network');
    this.name = 'NetworkError';
  }
}

export class ServerError extends ApiError {
  constructor(public readonly statusCode: number, message: string = 'Server error') {
    super(message, 'server');
    this.name = 'ServerError';
  }
}

export class TimeoutError extends ApiError {
  constructor(message: string = 'Request timed out') {
    super(message, 'timeout');
    this.name = 'TimeoutError';
  }
}

export class ParseError extends ApiError {
  constructor(message: string = 'Failed to parse response') {
    super(message, 'parse');
    this.name = 'ParseError';
  }
}

// --- UUID Generator ---

function generateRequestId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// --- Core Request ---

interface RequestOptions {
  action: string;
  payload?: Record<string, unknown>;
  retries?: number;
}

async function makeRequest<T>(options: RequestOptions): Promise<T> {
  const { action, payload = {}, retries = CONFIG.MAX_RETRIES } = options;
  const requestId = generateRequestId();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      const delay = Math.min(
        CONFIG.RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1),
        CONFIG.RETRY_MAX_DELAY_MS,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
        },
        body: JSON.stringify({ action, ...payload }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status >= 500 && attempt < retries) {
        lastError = new ServerError(response.status, `Server error ${response.status}`);
        continue; // Retry 5xx
      }

      if (!response.ok) {
        throw new ServerError(response.status, `HTTP ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      try {
        const data = JSON.parse(text) as T;
        return data;
      } catch {
        throw new ParseError(`Invalid JSON response: ${text.substring(0, 200)}`);
      }
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      if (error instanceof ApiError) {
        if (error instanceof ServerError && attempt < retries) {
          lastError = error;
          continue;
        }
        throw error;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        lastError = new TimeoutError();
        if (attempt < retries) {
          continue;
        }
        throw lastError;
      }

      // Network/fetch failure — retry
      lastError = new NetworkError(
        error instanceof Error ? error.message : 'Network request failed',
      );
      if (attempt < retries) {
        continue;
      }
      throw lastError;
    }
  }

  throw lastError || new NetworkError('Request failed after retries');
}

// --- Public API ---

export interface QueryResponse {
  status: string;
  response?: string;
  laws?: Array<Record<string, unknown>>;
  penalties?: Array<Record<string, unknown>>;
  message?: string;
  [key: string]: unknown;
}

export interface HealthResponse {
  status: string;
  laws_count?: number;
  penalties_count?: number;
  zones_count?: number;
  [key: string]: unknown;
}

export interface ZoneCheckResponse {
  status: string;
  zone_type?: string;
  zone_name?: string;
  message?: string;
  suggested_query?: string;
  severity?: string;
  [key: string]: unknown;
}

export const apiService = {
  /**
   * Send a natural language query to the DriveLegal AI backend.
   */
  async query(
    text: string,
    state: string,
    language: string = 'en',
    location?: { lat: number; lng: number },
    history?: Array<{ role: string; content: string }>,
    navigationContext?: Record<string, unknown>,
  ): Promise<QueryResponse> {
    return makeRequest<QueryResponse>({
      action: 'query',
      payload: { text, state, language, location, history, navigationContext },
    });
  },

  /**
   * Check backend health/connectivity.
   * Uses GET /health (which the backend exposes).
   */
  async health(): Promise<HealthResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/health`, {
        method: 'GET',
        headers: { 'X-Request-ID': generateRequestId() },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ServerError(response.status);
      }

      const text = await response.text();
      try {
        return JSON.parse(text) as HealthResponse;
      } catch {
        throw new ParseError();
      }
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new TimeoutError();
      }
      throw new NetworkError(
        error instanceof Error ? error.message : 'Health check failed',
      );
    }
  },

  /**
   * Check if a location is in a special traffic zone.
   */
  async zoneCheck(
    lat: number,
    lng: number,
    state: string,
    heading?: number | null,
    speed?: number,
  ): Promise<ZoneCheckResponse> {
    return makeRequest<ZoneCheckResponse>({
      action: 'check_zone',
      payload: {
        location: { lat, lng, state, heading, speed },
      },
    });
  },

  /**
   * Get penalties for a violation type in a state.
   */
  async getPenalties(
    state: string,
    violationType?: string,
  ): Promise<QueryResponse> {
    return makeRequest<QueryResponse>({
      action: 'get_penalties',
      payload: { state, violation_type: violationType },
    });
  },

  /**
   * Get speed limit at a location.
   */
  async getSpeedLimit(
    lat: number,
    lng: number,
    state: string,
  ): Promise<QueryResponse> {
    return makeRequest<QueryResponse>({
      action: 'get_speed_limit',
      payload: { lat, lng, state },
    });
  },

  /**
   * Compare routes using multi-engine routing.
   */
  async compareRoutes(origin: [number, number], destination: [number, number]): Promise<any> {
    return makeRequest<any>({
      action: 'compare_routes',
      payload: { origin, destination },
    });
  },

  /**
   * Explain route rationale using server-side LLM.
   */
  async explainRoute(routeData: any): Promise<any> {
    return makeRequest<any>({
      action: 'explain_route',
      payload: { route: routeData },
    });
  },
};
