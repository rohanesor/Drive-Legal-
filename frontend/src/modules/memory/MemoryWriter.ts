import { ContextStore } from './ContextStore';
import { MemorySummarizer } from './MemorySummarizer';

export class MemoryWriter {
  private store: ContextStore;

  constructor(store: ContextStore) {
    this.store = store;
  }

  /**
   * Logs a user/bot query into the conversation logs.
   */
  logConversationTurn(role: 'user' | 'assistant' | 'system', content: string): void {
    this.store.addConversationTurn(role, content);
    this.store.save(); // enforce privacy filters
  }

  /**
   * Logs trip end metrics, analyzing speeding/braking patterns to update long term profiles.
   */
  logTripEnd(): void {
    const memory = this.store.getMemory();
    if (!memory.currentTrip) return;

    // Analyze driving patterns from trip incidents
    const newPatterns = MemorySummarizer.analyzeDrivingPatterns(memory.currentTrip);
    const existingPatterns = memory.longTerm.learnedPatterns;

    // Merge patterns
    const merged = [...existingPatterns];
    newPatterns.forEach((newPat) => {
      const idx = merged.findIndex((p) => p.category === newPat.category);
      if (idx !== -1) {
        // Increment frequency
        merged[idx].frequency += newPat.frequency;
        merged[idx].lastObserved = Date.now();
      } else {
        merged.push(newPat);
      }
    });

    // Update long term average DriveScore and trip count
    const tripScore = memory.currentTrip.tripScore;
    const count = memory.longTerm.tripsCount + 1;
    const avgScore = Math.round(
      ((memory.longTerm.averageDriveScore * memory.longTerm.tripsCount) + tripScore) / count
    );

    this.store.updateLongTerm({
      tripsCount: count,
      averageDriveScore: avgScore,
      learnedPatterns: merged,
    });

    this.store.save(); // Enforce privacy
  }
}
export default MemoryWriter;
