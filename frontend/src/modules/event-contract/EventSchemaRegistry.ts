import { DriveLegalEvent } from './types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class EventSchemaRegistry {
  /**
   * Strongly validates event envelopes and payloads against structural schemas and ranges.
   */
  static validate(event: DriveLegalEvent): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!event.eventId) errors.push("Missing required field: eventId");
    if (!event.eventType) errors.push("Missing required field: eventType");
    if (!event.eventVersion) errors.push("Missing required field: eventVersion");
    if (!event.schemaVersion) errors.push("Missing required field: schemaVersion");
    if (!event.occurredAt) errors.push("Missing required field: occurredAt");
    if (!event.publishedAt) errors.push("Missing required field: publishedAt");
    if (event.sequence === undefined) errors.push("Missing required field: sequence");
    if (!event.source) errors.push("Missing required field: source");
    if (!event.correlationId) errors.push("Missing required field: correlationId");
    if (!event.confidence) errors.push("Missing required field: confidence");

    if (event.confidence && (event.confidence.score < 0 || event.confidence.score > 1)) {
      errors.push("Invalid confidence score range: must be between 0 and 1");
    }

    const payload = event.payload;
    if (!payload) {
      errors.push("Missing event payload content");
    } else {
      if (event.eventType === 'location.updated') {
        const lat = payload.latitude;
        const lon = payload.longitude;
        if (lat === undefined || lat < -90 || lat > 90) {
          errors.push("Invalid latitude: must be between -90 and 90");
        }
        if (lon === undefined || lon < -180 || lon > 180) {
          errors.push("Invalid longitude: must be between -180 and 180");
        }
        if (payload.accuracy !== undefined && payload.accuracy < 0) {
          errors.push("Invalid accuracy: must be non-negative");
        }
      }

      if (event.eventType === 'hazard.detected') {
        const conf = payload.confidence;
        if (conf === undefined || conf < 0 || conf > 1) {
          errors.push("Invalid hazard confidence: must be between 0 and 1");
        }
        const hazardTypes = ['pedestrian', 'obstacle', 'pothole', 'collision-risk', 'roadwork', 'debris'];
        if (!hazardTypes.includes(payload.hazardType)) {
          errors.push(`Invalid hazardType: ${payload.hazardType}`);
        }
      }

      if (event.eventType === 'policy.decision') {
        const validDecisions = ['ALLOW', 'DENY', 'REQUIRE_CONFIRMATION', 'DEFER', 'SAFE_FALLBACK'];
        if (!validDecisions.includes(payload.decision)) {
          errors.push(`Invalid policy decision: ${payload.decision}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Confirms if the schema changes from v1 to v2 are backward compatible.
   */
  static checkCompatibility(v1: string, v2: string): 'BACKWARD_COMPATIBLE' | 'FORWARD_COMPATIBLE' | 'BREAKING' {
    if (v1 === v2) return 'BACKWARD_COMPATIBLE';
    const major1 = parseInt(v1.split('.')[0]);
    const major2 = parseInt(v2.split('.')[0]);
    if (isNaN(major1) || isNaN(major2) || major1 !== major2) {
      return 'BREAKING';
    }
    return 'BACKWARD_COMPATIBLE';
  }
}
export default EventSchemaRegistry;
