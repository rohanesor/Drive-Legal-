import { TelemetryQuality, TelemetryStatus, VehicleTelemetry } from './types';

export class TelemetryQualityEngine {
  /**
   * Assesses quality coefficients of a telemetry snapshot.
   */
  static evaluate(telemetry: VehicleTelemetry): TelemetryQuality {
    const now = Date.now();
    const freshness = now - telemetry.timestamp;
    
    let status: TelemetryStatus = 'HEALTHY';
    let confidence = telemetry.confidence;

    if (freshness > 10000) {
      status = 'STALE';
      confidence = Math.max(0.1, confidence * 0.3);
    } else if (freshness > 3000) {
      status = 'DEGRADED';
      confidence = Math.max(0.1, confidence * 0.7);
    }

    if (telemetry.source === 'NONE') {
      status = 'UNAVAILABLE';
      confidence = 0.0;
    }

    return {
      source: telemetry.source,
      timestamp: telemetry.timestamp,
      freshness,
      accuracy: confidence,
      confidence,
      status,
    };
  }
}
export default TelemetryQualityEngine;
