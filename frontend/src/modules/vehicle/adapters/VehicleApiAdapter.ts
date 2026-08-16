import { VehicleProvider, VehicleTelemetry, VehicleCapabilities, VehicleConnectionState } from '../types';

export class VehicleApiAdapter implements VehicleProvider {
  private status: VehicleConnectionState = 'DISCONNECTED';
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
      throttle: true,
      brake: true,
      acceleration: true,
      steering: true,
      battery: true,
      charging: true,
      fuel: false,
      gear: true,
      odometer: true,
    };
  }

  subscribe(callback: (data: VehicleTelemetry) => void): void {
    this.callback = callback;
  }

  simulateTelemetry(data: Omit<VehicleTelemetry, 'source' | 'confidence'>): void {
    if (this.status === 'CONNECTED' && this.callback) {
      this.callback({
        ...data,
        source: 'API',
        confidence: 0.98,
      });
    }
  }
}
export default VehicleApiAdapter;
