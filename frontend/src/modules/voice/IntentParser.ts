import { VoiceIntent } from './types';

export class IntentParser {
  /**
   * Deterministically matches text transcript queries to structured intents.
   * Prevents arbitrary LLM actions bypass.
   */
  static parse(text: string): VoiceIntent {
    const clean = text.toLowerCase().trim();

    if (clean.includes('warning') || clean.includes('why are you')) {
      return { type: 'EXPLAIN_ALERT', confidence: 0.95, parameters: {} };
    }

    if (clean.includes('take me to') || clean.includes('navigate to')) {
      const match = text.match(/(?:take me to|navigate to)\s+(.+)/i);
      const destination = match ? match[1] : 'Unknown';
      return { type: 'NAVIGATE_TO', confidence: 0.9, parameters: { destination } };
    }

    if (clean.includes('safer route') || clean.includes('find safe')) {
      return { type: 'FIND_SAFE_ROUTE', confidence: 0.95, parameters: {} };
    }

    if (clean.includes('speed limit')) {
      return { type: 'ASK_SPEED_LIMIT', confidence: 0.98, parameters: {} };
    }

    if (clean.includes('cancel navigation') || clean.includes('stop navigation')) {
      return { type: 'CANCEL_NAVIGATION', confidence: 0.95, parameters: {} };
    }

    if (clean.includes('brake') || clean.includes('steer') || clean.includes('throttle') || clean.includes('accelerate')) {
      throw new Error('Vehicle control commands are strictly prohibited');
    }

    return {
      type: 'REPEAT_LAST_RESPONSE',
      confidence: 0.5,
      parameters: {},
    };
  }
}
export default IntentParser;
