import { WakeDetector } from './types';

export class LocalWakeDetector implements WakeDetector {
  private status: 'IDLE' | 'LISTENING' | 'ERROR' = 'IDLE';

  async start(): Promise<void> {
    this.status = 'LISTENING';
  }

  async stop(): Promise<void> {
    this.status = 'IDLE';
  }

  getStatus(): 'IDLE' | 'LISTENING' | 'ERROR' {
    return this.status;
  }
}
export default LocalWakeDetector;
