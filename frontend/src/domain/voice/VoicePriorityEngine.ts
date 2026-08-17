import { NativeModules, Platform } from 'react-native';

export type VoicePriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface VoiceMessage {
  id: string;
  text: string;
  langCode: string;
  priority: VoicePriority;
  category: string; // e.g., 'speeding', 'curve', 'turn', 'border', 'assistant'
  timestamp: number;
}

const PRIORITY_MAP: Record<VoicePriority, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

const COOLDOWN_MS: Record<string, number> = {
  speeding: 15000,   // 15 seconds
  curve: 20000,      // 20 seconds
  hairpin: 20000,    // 20 seconds
  border: 60000,     // 60 seconds (state boundary)
  restricted: 45000, // 45 seconds (restricted zones)
  school: 45000,     // 45 seconds
  accident: 30000,   // 30 seconds
};

export class VoicePriorityEngine {
  private activeMessage: VoiceMessage | null = null;
  private cooldowns: Map<string, number> = new Map();
  private speakTimeout: ReturnType<typeof setTimeout> | null = null;

  async speak(text: string, priority: VoicePriority, category: string, langCode = 'en') {
    const now = Date.now();

    // 1. Check cooldown for this category to prevent spamming
    const lastTriggered = this.cooldowns.get(category) || 0;
    const cooldown = COOLDOWN_MS[category] || 5000;
    if (now - lastTriggered < cooldown) {
      console.log(`[VoicePriorityEngine] Cooldown active for category: ${category}. Ignoring.`);
      return;
    }

    const incomingPriorityVal = PRIORITY_MAP[priority];
    
    // 2. Query native TTS state if supported
    let isTtsSpeaking = false;
    const { DriveLegalTTS } = NativeModules;
    if (DriveLegalTTS) {
      try {
        isTtsSpeaking = await DriveLegalTTS.isSpeaking();
      } catch {
        isTtsSpeaking = this.activeMessage !== null;
      }
    } else {
      isTtsSpeaking = this.activeMessage !== null;
    }

    // 3. Evaluate priorities
    if (isTtsSpeaking && this.activeMessage) {
      const activePriorityVal = PRIORITY_MAP[this.activeMessage.priority];
      
      if (incomingPriorityVal > activePriorityVal) {
        console.log(`[VoicePriorityEngine] Interrupting ${this.activeMessage.priority} alert with higher priority ${priority} alert.`);
        this.interruptAndSpeak(text, priority, category, langCode, now);
      } else {
        console.log(`[VoicePriorityEngine] Lower or equal priority alert (${priority} <= ${this.activeMessage.priority}) ignored while speaking.`);
      }
    } else {
      // Direct speak
      this.interruptAndSpeak(text, priority, category, langCode, now);
    }
  }

  private interruptAndSpeak(text: string, priority: VoicePriority, category: string, langCode: string, timestamp: number) {
    const { DriveLegalTTS } = NativeModules;
    
    if (this.speakTimeout) {
      clearTimeout(this.speakTimeout);
      this.speakTimeout = null;
    }

    this.cooldowns.set(category, timestamp);
    this.activeMessage = {
      id: `${category}_${timestamp}`,
      text,
      langCode,
      priority,
      category,
      timestamp,
    };

    const localeMap: Record<string, string> = {
      en: 'en-IN',
      ta: 'ta-IN',
      hi: 'hi-IN',
      kn: 'kn-IN',
      te: 'te-IN',
      ml: 'ml-IN',
      mr: 'mr-IN',
      gu: 'gu-IN',
    };
    const targetLocale = localeMap[langCode] || langCode || 'en-IN';

    if (DriveLegalTTS) {
      DriveLegalTTS.speak(text, targetLocale)
        .then(() => {
          // Estimate speech duration: ~150 words per minute (2.5 words per second)
          const wordCount = text.split(/\s+/).length;
          const estimatedDurationMs = Math.max(2000, (wordCount / 2.5) * 1000 + 500);
          
          this.speakTimeout = setTimeout(() => {
            this.activeMessage = null;
          }, estimatedDurationMs);
        })
        .catch((err: unknown) => {
          console.warn('[VoicePriorityEngine] Speak failed:', err);
          this.activeMessage = null;
        });
    } else {
      console.log(`[VoicePriorityEngine Mock TTS] Speak (${priority}): "${text}"`);
      
      const wordCount = text.split(/\s+/).length;
      const estimatedDurationMs = Math.max(2000, (wordCount / 2.5) * 1000 + 500);
      
      this.speakTimeout = setTimeout(() => {
        this.activeMessage = null;
      }, estimatedDurationMs);
    }
  }

  stop() {
    const { DriveLegalTTS } = NativeModules;
    if (this.speakTimeout) {
      clearTimeout(this.speakTimeout);
      this.speakTimeout = null;
    }
    if (DriveLegalTTS) {
      DriveLegalTTS.stop();
    }
    this.activeMessage = null;
  }
}

export const voicePriorityEngine = new VoicePriorityEngine();
export default voicePriorityEngine;
