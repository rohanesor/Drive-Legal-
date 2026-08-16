import { SensorProvider, VoiceData, SensorStatus } from './types';

export class VoiceProvider implements SensorProvider<VoiceData> {
  private status: SensorStatus = 'UNAVAILABLE';
  private callback?: (data: VoiceData) => void;

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

  subscribe(callback: (data: VoiceData) => void): void {
    this.callback = callback;
  }

  emitVoiceInput(transcript: string, confidence: number = 0.95): void {
    if (this.callback) {
      this.callback({
        transcript,
        confidence,
        timestamp: Date.now(),
      });
    }
  }
}
export default VoiceProvider;
