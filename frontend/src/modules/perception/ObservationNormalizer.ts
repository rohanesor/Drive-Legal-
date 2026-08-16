import { Observation, ObservationType } from './types';
import { DetectedSign } from './detectors/TrafficSignDetector';

export class ObservationNormalizer {
  private static observationCounter = 0;

  static normalizeSign(
    sign: DetectedSign,
    location?: { latitude: number; longitude: number }
  ): Observation {
    this.observationCounter++;

    let type: ObservationType = 'SPEED_LIMIT_SIGN';
    if (sign.type === 'NO_ENTRY') type = 'NO_ENTRY_SIGN';
    else if (sign.type === 'NO_PARKING') type = 'NO_PARKING_SIGN';
    else if (sign.type === 'ONE_WAY') type = 'ONE_WAY_SIGN';
    else if (sign.type === 'SCHOOL_ZONE') type = 'SCHOOL_ZONE_SIGN';

    return {
      id: `obs_sign_${Date.now()}_${this.observationCounter}`,
      type,
      timestamp: sign.timestamp,
      location,
      value: sign.value,
      confidence: sign.confidence,
      source: 'CAMERA',
      scope: type === 'SCHOOL_ZONE_SIGN' ? 'ZONE' : 'POINT',
      lifecycle: 'DETECTED',
      expiresAt: sign.timestamp + 30000, // 30s temporal validity window
    };
  }

  static normalizeGPS(
    latitude: number,
    longitude: number,
    speed: number,
    heading: number,
    accuracy: number,
    timestamp: number
  ): Observation {
    this.observationCounter++;
    return {
      id: `obs_gps_${Date.now()}_${this.observationCounter}`,
      type: 'ROAD_RESTRICTION',
      timestamp,
      location: { latitude, longitude },
      value: { speed, heading, accuracy },
      confidence: accuracy < 10 ? 0.98 : accuracy < 30 ? 0.8 : 0.4,
      source: 'GPS',
      scope: 'POINT',
      lifecycle: 'ACTIVE',
    };
  }
}
export default ObservationNormalizer;
