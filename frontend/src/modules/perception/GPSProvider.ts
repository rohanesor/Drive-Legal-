import { SensorProvider, GPSData, SensorStatus } from './types';

export class GPSProvider implements SensorProvider<GPSData> {
  private status: SensorStatus = 'UNAVAILABLE';
  private callback?: (data: GPSData) => void;
  private lastData?: GPSData;

  async start(): Promise<void> {
    this.status = 'HEALTHY';
  }

  async stop(): Promise<void> {
    this.status = 'UNAVAILABLE';
  }

  getStatus(): SensorStatus {
    if (this.lastData) {
      const elapsed = Date.now() - this.lastData.timestamp;
      if (elapsed > 10000) {
        return 'STALE';
      }
    }
    return this.status;
  }

  setStatus(status: SensorStatus): void {
    this.status = status;
  }

  subscribe(callback: (data: GPSData) => void): void {
    this.callback = callback;
  }

  updateGPS(data: GPSData): void {
    // 1. Low accuracy check
    if (data.accuracy > 50) {
      this.status = 'DEGRADED';
    } else {
      this.status = 'HEALTHY';
    }

    // 2. Impossible movement check
    if (this.lastData) {
      const timeDiffSeconds = (data.timestamp - this.lastData.timestamp) / 1000;
      if (timeDiffSeconds > 0) {
        const dLat = (data.latitude - this.lastData.latitude) * 111;
        const dLon = (data.longitude - this.lastData.longitude) * 111;
        const distKm = Math.sqrt(dLat * dLat + dLon * dLon);
        const speedKmH = (distKm / timeDiffSeconds) * 3600;

        if (speedKmH > 300) {
          console.warn('[GPSProvider] Impossible speed spike detected, rejecting update.');
          this.status = 'DEGRADED';
          return; // Reject update
        }
      }
    }

    this.lastData = data;
    if (this.callback) {
      this.callback(data);
    }
  }

  getLastData(): GPSData | undefined {
    return this.lastData;
  }
}
export default GPSProvider;
