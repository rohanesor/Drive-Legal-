import { AgentIntent } from './types';

export class IntentRouter {
  /**
   * Deterministically routes driver natural language requests to matching AgentIntents.
   */
  static detectIntent(request: string): AgentIntent {
    const text = request.trim().toLowerCase();

    if (
      text.includes('crash') || 
      text.includes('emergency') || 
      text.includes('sos') || 
      text.includes('breakdown') || 
      text.includes('distress')
    ) {
      return 'EMERGENCY';
    }

    if (
      text.includes('tradeoff') ||
      text.includes('why route')
    ) {
      return 'ROUTE_QUERY';
    }

    if (
      text.includes('navigate') || 
      text.includes('reroute') || 
      text.includes('take alternative') || 
      text.includes('go to') ||
      text.includes('safer route') ||
      text.includes('alternative route')
    ) {
      return 'NAVIGATION_REQUEST';
    }

    if (
      text.includes('fine') || 
      text.includes('penalty') || 
      text.includes('rule') || 
      text.includes('law') || 
      text.includes('park') || 
      text.includes('helmet') || 
      text.includes('license') || 
      text.includes('restricted') || 
      text.includes('one way') ||
      text.includes('can i drive') ||
      text.includes('can i park')
    ) {
      return 'LEGAL_QUERY';
    }

    if (
      text.includes('tradeoff') ||
      text.includes('why route') ||
      text.includes('route') || 
      text.includes('path') || 
      text.includes('destination')
    ) {
      return 'ROUTE_QUERY';
    }

    if (
      text.includes('score') || 
      text.includes('grade') || 
      text.includes('drivescore') ||
      text.includes('my rating')
    ) {
      return 'SCORE_QUERY';
    }

    if (
      text.includes('why warning') || 
      text.includes('warning') || 
      text.includes('danger') || 
      text.includes('safe') || 
      text.includes('accident') || 
      text.includes('harsh') ||
      text.includes('risk')
    ) {
      return 'SAFETY_QUERY';
    }

    if (
      text.includes('status') || 
      text.includes('how am i driving') || 
      text.includes('current status')
    ) {
      return 'CURRENT_STATUS';
    }

    return 'GENERAL_QUERY';
  }
}
export default IntentRouter;
