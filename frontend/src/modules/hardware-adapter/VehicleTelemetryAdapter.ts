import { HardwareAdapter, AdapterState, AdapterCapabilities, AdapterHealth } from './types';

export class VehicleTelemetryAdapter implements HardwareAdapter {
  id = 'vehicle_telemetry_default';
  type = 'vehicle_telemetry';
  version = '1.0.0';

  private state: AdapterState = 'STOPPED';
  private callback?: (event: any) => void;
  private isConnected = false;

  async initialize(): Promise<void> { this.state = 'READY'; }
  async start(): Promise<void> { this.state = 'RUNNING'; }
  async stop(): Promise<void> { this.state = 'STOPPED'; }
  async pause(): Promise<void> { this.state = 'PAUSED'; }
  async resume(): Promise<void> { this.state = 'RUNNING'; }
  getStatus(): AdapterState { return this.state; }
  getCapabilities(): AdapterCapabilities { return { obdRead: true }; }
  async healthCheck(): Promise<AdapterHealth> {
    return { status: this.state, lastSeen: Date.now(), latency: 10, errorRate: 0, droppedSamples: 0, reconnectCount: 0 };
  }
  subscribe(callback: (event: any) => void): void { this.callback = callback; }
  async dispose(): Promise<void> { this.state = 'STOPPED'; }

  connect(): void {
    this.isConnected = true;
    this.state = 'RUNNING';
  }

  disconnect(): void {
    this.isConnected = false;
    this.state = 'DISCONNECTED';
  }

  pushTelemetry(sample: {
    speed?: number;
    rpm?: number;
    ignition?: boolean;
    gear?: string;
    fuelLevel?: number;
  }): void {
    if (this.state !== 'RUNNING') return;

    if (this.callback) {
      this.callback({
        type: 'vehicle.updated',
        payload: {
          speed: sample.speed !== undefined ? sample.speed : null,
          rpm: sample.rpm !== undefined ? sample.rpm : null,
          ignition: sample.ignition !== undefined ? sample.ignition : null,
          gear: sample.gear !== undefined ? sample.gear : null,
          speedStatus: sample.speed !== undefined ? 'AVAILABLE' : 'UNAVAILABLE',
          rpmStatus: sample.rpm !== undefined ? 'AVAILABLE' : 'UNAVAILABLE',
          ignitionStatus: sample.ignition !== undefined ? 'AVAILABLE' : 'UNAVAILABLE',
          gearStatus: sample.gear !== undefined ? 'AVAILABLE' : 'UNAVAILABLE',
          telemetryHealth: 'HEALTHY',
          observedAt: Date.now(),
        },
      });
    }
  }
}
export default VehicleTelemetryAdapter;
