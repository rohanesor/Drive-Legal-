import { VehicleTelemetry } from './types';

export class TelemetryNormalizer {
  /**
   * Normalizes raw metrics into standard units and runs validation rules on range bounds.
   */
  static normalize(raw: Partial<VehicleTelemetry>): VehicleTelemetry {
    const timestamp = raw.timestamp || Date.now();
    const source = raw.source || 'NONE';
    let confidence = raw.confidence ?? 0.8;

    let speed = raw.speed;
    if (speed !== undefined) {
      if (speed < 0 || speed > 400) {
        console.warn(`[TelemetryNormalizer] Invalid speed value detected: ${speed}`);
        speed = undefined;
        confidence = Math.max(0.1, confidence - 0.5);
      }
    }

    let batteryLevel = raw.batteryLevel;
    if (batteryLevel !== undefined) {
      if (batteryLevel < 0 || batteryLevel > 100) {
        console.warn(`[TelemetryNormalizer] Invalid battery level detected: ${batteryLevel}`);
        batteryLevel = undefined;
        confidence = Math.max(0.1, confidence - 0.5);
      }
    }

    let fuelLevel = raw.fuelLevel;
    if (fuelLevel !== undefined) {
      if (fuelLevel < 0 || fuelLevel > 100) {
        fuelLevel = undefined;
        confidence = Math.max(0.1, confidence - 0.5);
      }
    }

    let engineRpm = raw.engineRpm;
    if (engineRpm !== undefined && engineRpm < 0) {
      engineRpm = undefined;
      confidence = Math.max(0.1, confidence - 0.3);
    }

    let acceleration = raw.acceleration;
    if (acceleration !== undefined) {
      // Impossible acceleration spike filter (> 20 m/s^2)
      if (Math.abs(acceleration) > 20) {
        console.warn(`[TelemetryNormalizer] Impossible acceleration spike filtered: ${acceleration}`);
        acceleration = undefined;
        confidence = Math.max(0.1, confidence - 0.4);
      }
    }

    return {
      ...raw,
      timestamp,
      speed,
      engineRpm,
      batteryLevel,
      fuelLevel,
      acceleration,
      source,
      confidence,
    };
  }
}
export default TelemetryNormalizer;
