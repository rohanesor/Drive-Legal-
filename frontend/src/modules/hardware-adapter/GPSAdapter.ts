import { HardwareAdapter, AdapterState, AdapterCapabilities, AdapterHealth } from './types';

export class GPSAdapter implements HardwareAdapter {
  id = 'gps_default';
  type = 'gps';
  version = '1.0.0';

  private state: AdapterState = 'STOPPED';
  private callback?: (event: any) => void;
  private lastLocation?: { latitude: number; longitude: number; timestamp: number };

  async initialize(): Promise<void> {
    this.state = 'READY';
  }

  async start(): Promise<void> {
    this.state = 'RUNNING';
  }

  async stop(): Promise<void> {
    this.state = 'STOPPED';
  }

  async pause(): Promise<void> {
    this.state = 'PAUSED';
  }

  async resume(): Promise<void> {
    this.state = 'RUNNING';
  }

  getStatus(): AdapterState {
    return this.state;
  }

  getCapabilities(): AdapterCapabilities {
    return { location: true, altitude: true, heading: true, speed: true, accuracy: true };
  }

  async healthCheck(): Promise<AdapterHealth> {
    return {
      status: this.state,
      lastSeen: Date.now(),
      latency: 10,
      errorRate: 0.0,
      droppedSamples: 0,
      reconnectCount: 0,
    };
  }

  subscribe(callback: (event: any) => void): void {
    this.callback = callback;
  }

  async dispose(): Promise<void> {
    this.state = 'STOPPED';
  }

  processGPSUpdate(update: {
    latitude: number;
    longitude: number;
    accuracy: number;
    speed: number;
    heading: number;
    timestamp: number;
  }): void {
    const { latitude, longitude, accuracy, speed, heading, timestamp } = update;

    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
      console.warn('[GPSAdapter] Rejected invalid latitude:', latitude);
      return;
    }
    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
      console.warn('[GPSAdapter] Rejected invalid longitude:', longitude);
      return;
    }

    const elapsed = Date.now() - timestamp;
    if (elapsed > 5000) {
      if (this.callback) {
        this.callback({ type: 'location.stale', payload: { lastSeen: timestamp } });
      }
      return;
    }

    if (this.lastLocation) {
      const distMeters = this.calculateDistance(
        this.lastLocation.latitude,
        this.lastLocation.longitude,
        latitude,
        longitude
      );
      const timeSec = (timestamp - this.lastLocation.timestamp) / 1000;
      if (timeSec > 0) {
        const impliedVelocityKmH = (distMeters / timeSec) * 3.6;
        if (impliedVelocityKmH > 300) {
          if (this.callback) {
            this.callback({
              type: 'location.anomaly',
              payload: {
                impliedSpeed: impliedVelocityKmH,
                previous: this.lastLocation,
                current: update,
              },
            });
          }
        }
      }
    }

    this.lastLocation = { latitude, longitude, timestamp };

    let quality = 'UNAVAILABLE';
    if (accuracy <= 5) quality = 'EXCELLENT';
    else if (accuracy <= 15) quality = 'GOOD';
    else if (accuracy <= 30) quality = 'DEGRADED';
    else quality = 'POOR';

    if (this.callback) {
      this.callback({
        type: 'location.updated',
        payload: {
          latitude,
          longitude,
          speed,
          heading,
          accuracy,
          quality,
          observedAt: timestamp,
        },
      });
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}
export default GPSAdapter;
