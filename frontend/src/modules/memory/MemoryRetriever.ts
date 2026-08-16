import { ContextStore } from './ContextStore';

export class MemoryRetriever {
  private store: ContextStore;

  constructor(store: ContextStore) {
    this.store = store;
  }

  /**
   * Retrieves relevant memory logs to help synthesize agent answers.
   */
  retrieveConversationContext(): string {
    const memory = this.store.getMemory();
    const turns = memory.conversation.turns;
    if (turns.length === 0) {
      return '';
    }
    // Return last 3 turns as concise history string
    const recentTurns = turns.slice(-3);
    return recentTurns.map((turn) => `${turn.role}: ${turn.content}`).join('\n');
  }

  /**
   * Retrieves learned driving behavior patterns.
   */
  retrieveLearnedPatternsSummary(): string {
    const memory = this.store.getMemory();
    const patterns = memory.longTerm.learnedPatterns;
    if (patterns.length === 0) {
      return 'No historical safety patterns established.';
    }
    return patterns.map((p) => `- ${p.explanation}`).join('\n');
  }
}
export default MemoryRetriever;
