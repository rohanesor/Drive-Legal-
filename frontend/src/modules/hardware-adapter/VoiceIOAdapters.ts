import { HardwareAdapter, AdapterState, AdapterCapabilities, AdapterHealth } from './types';

export class MicrophoneAdapter implements HardwareAdapter {
  id = 'microphone_default';
  type = 'microphone';
  version = '1.0.0';

  private state: AdapterState = 'STOPPED';
  private callback?: (event: any) => void;

  async initialize(): Promise<void> { this.state = 'READY'; }
  async start(): Promise<void> { this.state = 'RUNNING'; }
  async stop(): Promise<void> { this.state = 'STOPPED'; }
  async pause(): Promise<void> { this.state = 'PAUSED'; }
  async resume(): Promise<void> { this.state = 'RUNNING'; }
  getStatus(): AdapterState { return this.state; }
  getCapabilities(): AdapterCapabilities { return { audioInput: true }; }
  async healthCheck(): Promise<AdapterHealth> {
    return { status: this.state, lastSeen: Date.now(), latency: 5, errorRate: 0, droppedSamples: 0, reconnectCount: 0 };
  }
  subscribe(callback: (event: any) => void): void { this.callback = callback; }
  async dispose(): Promise<void> { this.state = 'STOPPED'; }

  simulateSpeechInput(phrase: string): void {
    if (this.state !== 'RUNNING') return;
    if (this.callback) {
      this.callback({
        type: 'voice.command.received',
        payload: {
          transcript: phrase,
          confidence: 0.98,
          timestamp: Date.now(),
        },
      });
    }
  }
}

export class SpeakerAdapter implements HardwareAdapter {
  id = 'speaker_default';
  type = 'speaker';
  version = '1.0.0';

  private state: AdapterState = 'STOPPED';
  private callback?: (event: any) => void;

  async initialize(): Promise<void> { this.state = 'READY'; }
  async start(): Promise<void> { this.state = 'RUNNING'; }
  async stop(): Promise<void> { this.state = 'STOPPED'; }
  async pause(): Promise<void> { this.state = 'PAUSED'; }
  async resume(): Promise<void> { this.state = 'RUNNING'; }
  getStatus(): AdapterState { return this.state; }
  getCapabilities(): AdapterCapabilities { return {}; }
  async healthCheck(): Promise<AdapterHealth> {
    return { status: this.state, lastSeen: Date.now(), latency: 2, errorRate: 0, droppedSamples: 0, reconnectCount: 0 };
  }
  subscribe(callback: (event: any) => void): void { this.callback = callback; }
  async dispose(): Promise<void> { this.state = 'STOPPED'; }

  async speak(text: string): Promise<void> {
    if (this.callback) {
      this.callback({ type: 'speech.started', payload: { text } });
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
    if (this.callback) {
      this.callback({ type: 'speech.completed', payload: { text } });
    }
  }
}
