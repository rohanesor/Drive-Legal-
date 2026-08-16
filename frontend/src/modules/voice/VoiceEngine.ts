import { 
  VoiceSession, DriverMode, VoiceIntent, Transcript 
} from './types';
import { LocalWakeDetector } from './WakeDetector';
import { LocalSpeechRecognizer } from './SpeechRecognizer';
import { LocalSpeechSynthesizer } from './SpeechSynthesizer';
import { IntentParser } from './IntentParser';
import { VoicePolicy } from './VoicePolicy';

export class VoiceEngine {
  private session: VoiceSession;
  private wakeDetector: LocalWakeDetector;
  private recognizer: LocalSpeechRecognizer;
  private synthesizer: LocalSpeechSynthesizer;
  private driverMode: DriverMode = 'DRIVING';

  private listeners: Record<string, ((data: any) => void)[]> = {
    voice_command_received: [],
    voice_intent_detected: [],
    voice_action_started: [],
    voice_action_completed: [],
    voice_action_failed: [],
    voice_response_started: [],
    voice_response_completed: [],
  };

  constructor() {
    this.session = {
      id: `session_${Math.random().toString(36).substr(2, 9)}`,
      startedAt: Date.now(),
      lastActivityAt: Date.now(),
      state: 'IDLE',
      context: {
        language: { language: 'English', locale: 'en-US', confidence: 0.95 },
      },
    };

    this.wakeDetector = new LocalWakeDetector();
    this.recognizer = new LocalSpeechRecognizer();
    this.synthesizer = new LocalSpeechSynthesizer();

    this.recognizer.subscribe((t) => this.handleSpeechTranscript(t));
    this.synthesizer.setOnInterrupt(() => {
      this.session.state = 'INTERRUPTED';
      this.publish('voice_action_failed', { reason: 'INTERRUPTED' });
    });
  }

  getSession(): VoiceSession { return this.session; }
  getSpeechSynthesizer(): LocalSpeechSynthesizer { return this.synthesizer; }
  getSpeechRecognizer(): LocalSpeechRecognizer { return this.recognizer; }
  getDriverMode(): DriverMode { return this.driverMode; }
  setDriverMode(mode: DriverMode): void { this.driverMode = mode; }

  subscribeEvent(name: string, cb: (data: any) => void): void {
    if (this.listeners[name]) {
      this.listeners[name].push(cb);
    }
  }

  private publish(name: string, data: any): void {
    if (this.listeners[name]) {
      this.listeners[name].forEach(cb => cb(data));
    }
  }

  async startListening(): Promise<void> {
    if (this.session.state === 'RESPONDING') {
      await this.synthesizer.stop();
    }
    
    this.session.state = 'LISTENING';
    this.session.lastActivityAt = Date.now();
    await this.recognizer.start();
  }

  private async handleSpeechTranscript(transcript: Transcript): Promise<void> {
    this.publish('voice_command_received', transcript);

    if (transcript.confidence < 0.4) {
      this.session.state = 'ERROR';
      const text = "Sorry, I didn't catch that.";
      await this.speakResponse(text);
      return;
    }

    this.session.state = 'PROCESSING';
    
    let intent: VoiceIntent;
    try {
      intent = IntentParser.parse(transcript.text);
    } catch (e) {
      this.session.state = 'ERROR';
      const text = `Command blocked. ${(e as Error).message}.`;
      await this.speakResponse(text);
      this.publish('voice_action_failed', { reason: 'PROHIBITED' });
      return;
    }

    this.session.currentIntent = intent;
    this.publish('voice_intent_detected', intent);

    const classification = VoicePolicy.classifyAction(intent.type);
    if (classification === 'PROHIBITED') {
      this.session.state = 'ERROR';
      const text = 'I cannot perform vehicle steering or braking operations.';
      await this.speakResponse(text);
      this.publish('voice_action_failed', { reason: 'PROHIBITED' });
      return;
    }

    this.publish('voice_action_started', intent);
    
    let resultResponse = '';
    if (intent.type === 'ASK_SPEED_LIMIT') {
      resultResponse = 'The speed limit is 80 kilometres per hour. Mapped data is verified.';
    } else if (intent.type === 'EXPLAIN_ALERT') {
      resultResponse = 'You received an alert because your vehicle speed was 72 kilometres per hour on a 50 segment.';
    } else if (intent.type === 'FIND_SAFE_ROUTE') {
      resultResponse = 'I found a safer route. It is about 5 minutes longer but reduces risk.';
    } else if (intent.type === 'CANCEL_NAVIGATION') {
      resultResponse = 'Navigation has been cancelled.';
    } else {
      resultResponse = 'Request processed successfully.';
    }

    this.publish('voice_action_completed', intent);
    await this.speakResponse(resultResponse);
  }

  private async speakResponse(text: string): Promise<void> {
    this.session.state = 'RESPONDING';
    const cleanText = VoicePolicy.enforceLengthPolicy(text, this.driverMode);
    this.session.activeResponse = cleanText;

    this.publish('voice_response_started', { text: cleanText });
    await this.synthesizer.speak(cleanText);
    
    this.session.state = 'IDLE';
    this.publish('voice_response_completed', { text: cleanText });
  }

  async handleCriticalAlertInterrupt(alertMessage: string): Promise<void> {
    console.log(`[VoiceEngine] Critical Alert Interrupting TTS: "${alertMessage}"`);
    await this.synthesizer.stop();
    this.session.state = 'INTERRUPTED';
    await this.synthesizer.speak(`Alert: ${alertMessage}`);
  }
}
export default VoiceEngine;
