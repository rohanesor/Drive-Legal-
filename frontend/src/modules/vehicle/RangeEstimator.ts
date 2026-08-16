import { RangeEstimator } from './types';

export class EVRangeEstimator implements RangeEstimator {
  /**
   * Deterministically calculates estimated remaining range in kilometers.
   * Wh/km efficiency dictates depletion speed.
   */
  estimateRange(
    batteryLevel: number,
    efficiencyWhPerKm: number,
    routeDistanceKm?: number
  ): { estimatedRangeKm: number; confidence: number } {
    const batteryCapacityWh = 75000; // 75 kWh battery size standard mock
    const remainingEnergyWh = batteryCapacityWh * (batteryLevel / 100);
    
    const estimatedRangeKm = Math.round(remainingEnergyWh / efficiencyWhPerKm);
    let confidence = 0.9;

    if (batteryLevel < 10) {
      confidence = 0.7;
    }

    if (routeDistanceKm !== undefined && estimatedRangeKm < routeDistanceKm) {
      confidence = Math.max(0.5, confidence - 0.1);
    }

    return {
      estimatedRangeKm: Math.max(0, estimatedRangeKm),
      confidence,
    };
  }
}
export default EVRangeEstimator;
