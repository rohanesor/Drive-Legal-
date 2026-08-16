import { HardwareAdapter, AdapterState, AdapterCapabilities, AdapterHealth } from './types';

export class PhoneSensorAdapter implements HardwareAdapter {
  id = 'phone_sensor_default';
  type = 'phone_sensor';
  version = '1.0.0';

  private state: AdapterState = 'STOPPED';
  private callback?: (event: any) => void;

  async initialize(): Promise<void> { this.state = 'READY'; }
  async start(): Promise<void> { this.state = 'RUNNING'; }
  async stop(): Promise<void> { this.state = 'STOPPED'; }
  async pause(): Promise<void> { this.state = 'PAUSED'; }
  async resume(): Promise<void> { this.state = 'RUNNING'; }
  getStatus(): AdapterState { return this.state; }
  getCapabilities(): AdapterCapabilities { return { accuracy: true }; }
  async healthCheck(): Promise<AdapterHealth> {
    return { status: this.state, lastSeen: Date.now(), latency: 1, errorRate: 0, droppedSamples: 0, reconnectCount: 0 };
  }
  subscribe(callback: (event: any) => void): void { this.callback = callback; }
  async dispose(): Promise<void> { this.state = 'STOPPED'; }

  pushSensorSample(sample: { x: number; y: number; z: number }): void {
    if (this.state !== 'RUNNING') return;
    if (this.callback) {
      this.callback({
        type: 'sensor.motion.updated',
        payload: {
          accelerometer: {
            x: sample.x,
            y: sample.y,
            z: sample.z,
          },
          observedAt: Date.now(),
        },
      });
    }
  }
}

export class BLEAdapter implements HardwareAdapter {
  id = 'ble_default';
  type = 'ble';
  version = '1.0.0';

  private state: AdapterState = 'STOPPED';
  private callback?: (event: any) => void;

  async initialize(): Promise<void> { this.state = 'READY'; }
  async start(): Promise<void> { this.state = 'RUNNING'; }
  async stop(): Promise<void> { this.state = 'STOPPED'; }
  async pause(): Promise<void> { this.state = 'PAUSED'; }
  async resume(): Promise<void> { this.state = 'RUNNING'; }
  getStatus(): AdapterState { return this.state; }
  getCapabilities(): AdapterCapabilities { return { bleScan: true }; }
  async healthCheck(): Promise<AdapterHealth> {
    return { status: this.state, lastSeen: Date.now(), latency: 5, errorRate: 0, droppedSamples: 0, reconnectCount: 0 };
  }
  subscribe(callback: (event: any) => void): void { this.callback = callback; }
  async dispose(): Promise<void> { this.state = 'STOPPED'; }
}

export class NetworkAdapter implements HardwareAdapter {
  id = 'network_default';
  type = 'network';
  version = '1.0.0';

  private state: AdapterState = 'STOPPED';
  private callback?: (event: any) => void;
  private networkState = 'ONLINE';

  async initialize(): Promise<void> { this.state = 'READY'; }
  async start(): Promise<void> { this.state = 'RUNNING'; }
  async stop(): Promise<void> { this.state = 'STOPPED'; }
  async pause(): Promise<void> { this.state = 'PAUSED'; }
  async resume(): Promise<void> { this.state = 'RUNNING'; }
  getStatus(): AdapterState { return this.state; }
  getCapabilities(): AdapterCapabilities { return {}; }
  async healthCheck(): Promise<AdapterHealth> {
    return { status: this.state, lastSeen: Date.now(), latency: 15, errorRate: 0, droppedSamples: 0, reconnectCount: 0 };
  }
  subscribe(callback: (event: any) => void): void { this.callback = callback; }
  async dispose(): Promise<void> { this.state = 'STOPPED'; }

  setNetworkState(state: 'ONLINE' | 'OFFLINE' | 'DEGRADED'): void {
    this.networkState = state;
    if (this.callback) {
      this.callback({
        type: 'connectivity.changed',
        payload: {
          status: state,
          latency: 15,
          packetLoss: 0,
        },
      });
    }
  }
}
