import { PreferenceItem, PreferenceSource } from './types';

export class BehaviorAnalyzer {
  private static decayFactor = 0.9;

  /**
   * Records a routing decision event and updates the learned preference confidence.
   * Increments evidence counts and applies a temporal decay factor.
   */
  static recordSignal<T>(
    currentPref: PreferenceItem<T> | undefined,
    newValue: T,
    source: PreferenceSource = 'LEARNED'
  ): PreferenceItem<T> {
    const now = Date.now();
    
    if (!currentPref) {
      return {
        value: newValue,
        confidence: 0.2,
        evidenceCount: 1,
        lastObserved: now,
        source,
      };
    }

    const elapsedHours = (now - currentPref.lastObserved) / 3600000;
    const decayedConfidence = currentPref.confidence * Math.pow(this.decayFactor, Math.min(24, elapsedHours));

    let finalValue = currentPref.value;
    let finalConfidence = decayedConfidence;
    let count = currentPref.evidenceCount;

    if (newValue === currentPref.value) {
      count++;
      finalConfidence = Math.min(1.0, decayedConfidence + 0.1);
    } else {
      finalConfidence = Math.max(0.1, decayedConfidence - 0.15);
      if (finalConfidence < 0.3) {
        finalValue = newValue;
        finalConfidence = 0.3;
        count = 1;
      }
    }

    return {
      value: finalValue,
      confidence: finalConfidence,
      evidenceCount: count,
      lastObserved: now,
      source: currentPref.source === 'EXPLICIT' ? 'EXPLICIT' : source,
    };
  }
}
export default BehaviorAnalyzer;
