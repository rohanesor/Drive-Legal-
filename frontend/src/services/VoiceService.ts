/**
 * VoiceService.ts — Unified Cross-Platform Voice Service for Vazhi.
 * 
 * Provides platform-agnostic interface for Speech Recognition & TTS Synthesis.
 * Updates NavigationSession voiceState ('IDLE' | 'LISTENING' | 'PROCESSING' | 'SPEAKING' | 'ERROR').
 */

import { navigationSessionManager } from '../domain/session/NavigationSession';
import { voicePriorityEngine } from '../domain/voice/VoicePriorityEngine';

class VoiceServiceManager {
  private currentLanguage: string = 'en';

  public setLanguage(langCode: string): void {
    this.currentLanguage = langCode;
  }

  public async startListening(): Promise<void> {
    navigationSessionManager.setVoiceState('LISTENING');
  }

  public async stopListening(): Promise<void> {
    navigationSessionManager.setVoiceState('PROCESSING');
  }

  public async speak(text: string, isCriticalSafety: boolean = false): Promise<void> {
    navigationSessionManager.setVoiceState('SPEAKING');
    
    await voicePriorityEngine.speak(
      text,
      isCriticalSafety ? 'CRITICAL' : 'LOW',
      isCriticalSafety ? 'safety' : 'assistant',
      this.currentLanguage
    );

    navigationSessionManager.setVoiceState('IDLE');
  }

  public stopSpeaking(): void {
    voicePriorityEngine.stop();
    navigationSessionManager.setVoiceState('IDLE');
  }
}

export const voiceService = new VoiceServiceManager();
