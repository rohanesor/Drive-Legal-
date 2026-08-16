import { ScoreComponent, DriveScoreConfig } from './types';

export class ScoreAggregator {
  /**
   * Aggregates normalized components into a single score, renormalizing weights for missing/UNKNOWN inputs.
   * Also calculates confidence based on missing fields and data reliability.
   */
  static aggregate(
    components: Omit<ScoreComponent, 'weight'>[],
    config: DriveScoreConfig,
    baseEvidenceConfidence: number = 1.0
  ): { score: number; confidence: number; aggregatedComponents: ScoreComponent[] } {
    let activeWeightSum = 0;
    let weightedScoreSum = 0;

    // Retrieve default weights
    const weightMap: Record<string, number> = {
      'Driver Behavior': config.weights.driverBehavior,
      'Legal Compliance': config.weights.legalCompliance,
      'Road Safety': config.weights.roadSafety,
      'Environmental Risk': config.weights.environmentalRisk,
    };

    // First pass: identify active weights sum
    components.forEach((c) => {
      if (c.score !== -1) {
        activeWeightSum += weightMap[c.name] || 0.10;
      }
    });

    let missingConfidenceReduction = 0;

    // Second pass: renormalize weights and sum scores
    const aggregatedComponents = components.map((c) => {
      const defaultWeight = weightMap[c.name] || 0.10;
      if (c.score === -1) {
        // Unknown component reduces confidence
        missingConfidenceReduction += defaultWeight * 0.4; // deduct confidence proportionally to weight
        return {
          ...c,
          weight: 0,
        };
      }

      const renormalizedWeight = activeWeightSum > 0 ? defaultWeight / activeWeightSum : 0;
      weightedScoreSum += c.score * renormalizedWeight;

      return {
        ...c,
        weight: renormalizedWeight,
      };
    });

    const finalScore = activeWeightSum > 0 ? Math.round(weightedScoreSum) : 0;
    const confidence = Math.max(0.10, baseEvidenceConfidence - missingConfidenceReduction);

    return {
      score: Math.max(0, Math.min(100, finalScore)),
      confidence,
      aggregatedComponents,
    };
  }
}
export default ScoreAggregator;
