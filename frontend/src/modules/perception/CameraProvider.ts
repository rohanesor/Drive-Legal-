import { SensorProvider, CameraFrame, SensorStatus } from './types';

export class CameraProvider implements SensorProvider<CameraFrame> {
  private status: SensorStatus = 'UNAVAILABLE';
  private callback?: (data: CameraFrame) => void;

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

  subscribe(callback: (data: CameraFrame) => void): void {
    this.callback = callback;
  }

  simulateFrame(frame: CameraFrame): void {
    if (this.status === 'HEALTHY' && this.callback) {
      this.callback(frame);
    }
  }
}
export default CameraProvider;
