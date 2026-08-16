import { VehicleTelemetry, ChargingContext } from '../types';
import { EVRangeEstimator } from '../RangeEstimator';

export class EVAdapter {
  private estimator: EVRangeEstimator;

  constructor() {
    this.estimator = new EVRangeEstimator();
  }

  buildChargingContext(
    telemetry: VehicleTelemetry,
    destinationDistanceKm?: number
  ): ChargingContext {
    const battery = telemetry.batteryLevel ?? 100;
    const isCharging = telemetry.chargingState === 'charging';
    
    const rangeResult = this.estimator.estimateRange(battery, 180, destinationDistanceKm);
    
    const safetyMargin = 1.2;
    const chargingRequired = destinationDistanceKm !== undefined 
      ? rangeResult.estimatedRangeKm < (destinationDistanceKm * safetyMargin)
      : false;

    return {
      charging: isCharging,
      batteryPercent: battery,
      estimatedRangeKm: rangeResult.estimatedRangeKm,
      destinationDistanceKm,
      chargingRequired,
    };
  }
}
export default EVAdapter;
