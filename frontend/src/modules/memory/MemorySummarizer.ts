import { ConversationTurn, LearnedPattern, TripMemory } from './types';

export class MemorySummarizer {
  /**
   * Summarizes chat history turns into a concise single summary string.
   */
  static summarizeConversation(turns: ConversationTurn[]): string {
    if (turns.length === 0) return 'No conversation history.';

    const userQueries = turns
      .filter((t) => t.role === 'user')
      .map((t) => t.content.trim());
    
    if (userQueries.length === 0) return 'No user inquiries logged.';

    return `Driver asked about: "${userQueries.join('", "')}".`;
  }

  /**
   * Analyzes trip memory data to derive driver learned patterns.
   */
  static analyzeDrivingPatterns(trip: TripMemory): LearnedPattern[] {
    const patterns: LearnedPattern[] = [];

    // Analyze speeding incidents count
    const speedingCount = trip.loggedIncidentsCount['SPEEDING'] || 0;
    if (speedingCount > 3) {
      patterns.push({
        patternId: `pattern_speeding_${trip.tripId}`,
        category: 'SPEEDING',
        frequency: speedingCount,
        lastObserved: Date.now(),
        explanation: 'Driver exhibits repeated speeding patterns on active route segments.',
      });
    }

    // Analyze harsh braking
    const brakingCount = trip.loggedIncidentsCount['HARSH_BRAKING'] || 0;
    if (brakingCount > 2) {
      patterns.push({
        patternId: `pattern_braking_${trip.tripId}`,
        category: 'HARSH_BRAKING',
        frequency: brakingCount,
        lastObserved: Date.now(),
        explanation: 'Driver frequently performs harsh braking operations under normal route classes.',
      });
    }

    return patterns;
  }
}
export default MemorySummarizer;
