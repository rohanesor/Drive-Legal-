import { SpeechRecognizer, Transcript } from './types';

export class LocalSpeechRecognizer implements SpeechRecognizer {
  private status: 'IDLE' | 'LISTENING' | 'ERROR' = 'IDLE';
  private callback?: (t: Transcript) => void;

  async start(): Promise<void> {
    this.status = 'LISTENING';
  }

  async stop(): Promise<void> {
    this.status = 'IDLE';
  }

  async cancel(): Promise<void> {
    this.status = 'IDLE';
  }

  getStatus(): 'IDLE' | 'LISTENING' | 'ERROR' {
    return this.status;
  }

  subscribe(callback: (t: Transcript) => void): void {
    this.callback = callback;
  }

  simulateSpeech(text: string, confidence = 0.9): void {
    if (this.status === 'LISTENING' && this.callback) {
      this.callback({
        text,
        confidence,
        language: { language: 'English', locale: 'en-US', confidence: 0.95 },
        timestamp: Date.now(),
      });
    }
  }
}
export default LocalSpeechRecognizer;
