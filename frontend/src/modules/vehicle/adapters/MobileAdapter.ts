import { VehicleProvider, VehicleTelemetry, VehicleCapabilities, VehicleConnectionState } from '../types';

export class MobileAdapter implements VehicleProvider {
  private status: VehicleConnectionState = 'CONNECTED';
  private callback?: (data: VehicleTelemetry) => void;

  async connect(): Promise<void> {
    this.status = 'CONNECTED';
  }

  async disconnect(): Promise<void> {
    this.status = 'DISCONNECTED';
  }

  getStatus(): VehicleConnectionState {
    return this.status;
  }

  getCapabilities(): VehicleCapabilities {
    return {
      speed: true,
      rpm: false,
      throttle: false,
      brake: false,
      acceleration: true,
      steering: false,
      battery: false,
      charging: false,
      fuel: false,
      gear: false,
      odometer: false,
    };
  }

  subscribe(callback: (data: VehicleTelemetry) => void): void {
    this.callback = callback;
  }

  simulateTelemetry(data: Omit<VehicleTelemetry, 'source' | 'confidence'>): void {
    if (this.status === 'CONNECTED' && this.callback) {
      this.callback({
        ...data,
        source: 'MOBILE',
        confidence: 0.8,
      });
    }
  }
}
export default MobileAdapter;
