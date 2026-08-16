import { SensorProvider, VehicleTelemetryData, SensorStatus } from './types';

export class VehicleProvider implements SensorProvider<VehicleTelemetryData> {
  private status: SensorStatus = 'UNAVAILABLE';
  private callback?: (data: VehicleTelemetryData) => void;
  private lastData?: VehicleTelemetryData;

  async start(): Promise<void> {
    this.status = 'HEALTHY';
  }

  async stop(): Promise<void> {
    this.status = 'UNAVAILABLE';
  }

  getStatus(): SensorStatus {
    return this.status;
  }

  setStatus(status: SensorStatus): void {
    this.status = status;
  }

  subscribe(callback: (data: VehicleTelemetryData) => void): void {
    this.callback = callback;
  }

  updateTelemetry(data: VehicleTelemetryData): void {
    this.lastData = data;
    if (this.callback) {
      this.callback(data);
    }
  }

  getLastData(): VehicleTelemetryData | undefined {
    return this.lastData;
  }
}
export default VehicleProvider;
