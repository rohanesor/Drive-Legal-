import { SensorStatus } from './types';

export class ConfidenceEngine {
  /**
   * Refines raw observation confidence based on health status, temporal factors, and source weights.
   */
  static calculateConfidence(
    rawConfidence: number,
    sensorStatus: SensorStatus,
    temporalFactor: number = 1.0,
    sourcePriorityWeight: number = 1.0
  ): number {
    let healthFactor = 1.0;
    if (sensorStatus === 'DEGRADED') {
      healthFactor = 0.6;
    } else if (sensorStatus === 'STALE') {
      healthFactor = 0.3;
    } else if (sensorStatus === 'UNAVAILABLE') {
      healthFactor = 0.0;
    }

    const calculated = rawConfidence * healthFactor * temporalFactor * sourcePriorityWeight;
    return Math.max(0.0, Math.min(1.0, calculated));
  }
}
export default ConfidenceEngine;
