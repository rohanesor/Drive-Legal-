import { Observation, ConflictObservation } from './types';

export class ObservationFusion {
  /**
   * Merges matching observations from different sources using priority weights.
   * If values diverge, returns a ConflictObservation instead.
   */
  static fuse(
    cameraObs?: Observation,
    mapObs?: Observation,
    telemetryObs?: Observation
  ): Observation | ConflictObservation | null {
    const candidates = [cameraObs, mapObs, telemetryObs].filter(
      (obs): obs is Observation => !!obs
    );
    if (candidates.length === 0) return null;

    const type = candidates[0].type;
    const values = candidates.map((c) => c.value);

    // Check if there is a conflict (different values detected for the same type)
    const uniqueValues = Array.from(new Set(values));
    if (uniqueValues.length > 1) {
      const avgConfidence =
        candidates.reduce((sum, c) => sum + c.confidence, 0) / candidates.length;
      
      return {
        type,
        candidates,
        confidence: avgConfidence,
        resolutionStatus: 'PENDING',
      } as ConflictObservation;
    }

    // No conflict: fuse observations by taking the highest confidence candidate
    let bestCandidate = candidates[0];
    for (let i = 1; i < candidates.length; i++) {
      if (candidates[i].confidence > bestCandidate.confidence) {
        bestCandidate = candidates[i];
      }
    }

    // Boost confidence slightly due to multi-sensor confirmation
    const confirmationBoost = candidates.length > 1 ? 0.05 * (candidates.length - 1) : 0;
    const fusedConfidence = Math.min(1.0, bestCandidate.confidence + confirmationBoost);

    return {
      ...bestCandidate,
      confidence: fusedConfidence,
      id: `fused_${bestCandidate.id}`,
    };
  }
}
export default ObservationFusion;
