import { SpeechSynthesizer } from './types';

export class LocalSpeechSynthesizer implements SpeechSynthesizer {
  private activeText?: string;
  private onInterrupt?: () => void;

  async speak(text: string, options?: any): Promise<void> {
    this.activeText = text;
    console.log(`[LocalSpeechSynthesizer] Spoken: "${text}"`);
  }

  async stop(): Promise<void> {
    if (this.activeText && this.onInterrupt) {
      this.onInterrupt();
    }
    this.activeText = undefined;
  }

  async pause(): Promise<void> {
    // mock pause
  }

  async resume(): Promise<void> {
    // mock resume
  }

  getActiveText(): string | undefined {
    return this.activeText;
  }

  setOnInterrupt(callback: () => void): void {
    this.onInterrupt = callback;
  }
}
export default LocalSpeechSynthesizer;
