import { CONFIG } from '../../config';

export class VazhiApiClient {
  private static generateRequestId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private static async makeRequest<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
    const requestId = this.generateRequestId();
    const url = `${CONFIG.API_BASE_URL}/query`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
        },
        body: JSON.stringify({ action, ...payload }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      return JSON.parse(text) as T;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw err;
    }
  }

  static async calculateRoute(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }, vehicleType: string): Promise<any> {
    return this.makeRequest('calculate_route', { origin, destination, vehicleType });
  }

  static async checkZone(lat: number, lng: number, state: string): Promise<any> {
    return this.makeRequest('check_zone', { location: { lat, lng, state } });
  }

  static async getSpeedLimit(lat: number, lng: number, state: string, vehicleType: string): Promise<any> {
    return this.makeRequest('get_speed_limit', { lat, lng, state, vehicle_type: vehicleType });
  }

  static async getPenalties(state: string, violationType?: string): Promise<any> {
    return this.makeRequest('get_penalties', { state, violation_type: violationType });
  }

  static async queryLegalAssistant(
    text: string, 
    state: string, 
    language: string, 
    location?: { lat: number; lng: number },
    navigationContext?: Record<string, unknown>
  ): Promise<any> {
    return this.makeRequest('query', { text, state, language, location, navigationContext });
  }

  static async explainRoute(
    question: string, 
    navigationContext: Record<string, unknown>, 
    alternativeRoutes: any[]
  ): Promise<any> {
    const requestId = this.generateRequestId();
    const response = await fetch(`${CONFIG.API_BASE_URL}/navigation/explain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
      },
      body: JSON.stringify({ question, navigationContext, alternativeRoutes }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  static async compareRoutes(alternativeRoutes: any[]): Promise<any> {
    const requestId = this.generateRequestId();
    const response = await fetch(`${CONFIG.API_BASE_URL}/navigation/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
      },
      body: JSON.stringify({ alternativeRoutes }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  static async generateTripPlan(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    destName: string,
    startDate: string,
    startTime: string,
    prefs: Record<string, unknown>
  ): Promise<any> {
    return this.makeRequest('generate_trip_plan', {
      origin,
      destination,
      destinationName: destName,
      startDate,
      startTime,
      preferences: prefs,
    });
  }

  static async checkBackendHealth(): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/health`, {
        method: 'GET',
        headers: { 'X-Request-ID': this.generateRequestId() },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`Health HTTP ${response.status}`);
      return await response.json();
    } catch (e) {
      clearTimeout(timeoutId);
      throw e;
    }
  }
}
