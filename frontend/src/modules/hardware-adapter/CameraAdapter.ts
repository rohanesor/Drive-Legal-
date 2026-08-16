import { HardwareAdapter, AdapterState, AdapterCapabilities, AdapterHealth } from './types';

export class CameraAdapter implements HardwareAdapter {
  id = 'camera_default';
  type = 'camera';
  version = '1.0.0';

  private state: AdapterState = 'STOPPED';
  private callback?: (event: any) => void;
  private fps = 30;
  private frameDrops = 0;
  private latency = 15;

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
    return { frameCapture: true };
  }

  async healthCheck(): Promise<AdapterHealth> {
    return {
      status: this.state,
      lastSeen: Date.now(),
      latency: this.latency,
      errorRate: 0.0,
      droppedSamples: this.frameDrops,
      reconnectCount: 0,
    };
  }

  subscribe(callback: (event: any) => void): void {
    this.callback = callback;
  }

  async dispose(): Promise<void> {
    this.state = 'STOPPED';
  }

  simulateFrameCapture(observationType: 'SIGN' | 'HAZARD', payload: any): void {
    if (this.state !== 'RUNNING') return;

    if (this.callback) {
      if (observationType === 'SIGN') {
        this.callback({
          type: 'sign.detected',
          payload: {
            signType: payload.signType,
            value: payload.value,
            confidence: 0.94,
            observedAt: Date.now(),
          },
        });
      } else if (observationType === 'HAZARD') {
        this.callback({
          type: 'hazard.detected',
          payload: {
            hazardType: payload.hazardType,
            severity: payload.severity,
            confidence: 0.92,
            observedAt: Date.now(),
          },
        });
      }
    }
  }

  setFrameDrops(drops: number): void {
    this.frameDrops = drops;
    if (this.callback) {
      this.callback({
        type: 'camera.health.changed',
        payload: {
          fps: this.fps,
          frameDrops: this.frameDrops,
          latency: this.latency,
          status: this.state,
        },
      });
    }
  }
}
export default CameraAdapter;
