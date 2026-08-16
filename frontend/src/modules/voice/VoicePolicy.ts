import { DriverMode } from './types';

export class VoicePolicy {
  /**
   * Classifies action risks. Enforces that steering/braking control is PROHIBITED.
   */
  static classifyAction(intentType: string): 'READ_ONLY' | 'LOW_RISK_ACTION' | 'DRIVING_RELEVANT' | 'PROHIBITED' {
    if (intentType === 'ASK_SPEED_LIMIT' || intentType === 'ASK_CURRENT_SPEED' || intentType === 'ASK_DRIVESCORE') {
      return 'READ_ONLY';
    }

    if (
      intentType === 'NAVIGATE_TO' || 
      intentType === 'CHANGE_ROUTE' || 
      intentType === 'CANCEL_NAVIGATION' || 
      intentType === 'FIND_SAFE_ROUTE'
    ) {
      return 'DRIVING_RELEVANT';
    }

    if (
      intentType.includes('BRAKE') || 
      intentType.includes('STEER') || 
      intentType.includes('THROTTLE') || 
      intentType.includes('GEAR')
    ) {
      return 'PROHIBITED';
    }

    return 'LOW_RISK_ACTION';
  }

  /**
   * Formats speech output sentences depending on driver attention state.
   */
  static enforceLengthPolicy(text: string, driverMode: DriverMode): string {
    if (driverMode === 'DRIVING') {
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
      if (sentences.length > 2) {
        return sentences.map(s => s.trim()).slice(0, 2).join(' ');
      }
    }
    return text;
  }
}
export default VoicePolicy;
