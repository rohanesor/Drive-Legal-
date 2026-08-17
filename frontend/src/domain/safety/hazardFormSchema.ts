/**
 * hazardFormSchema.ts — Type-Safe Driver Hazard Reporting Schema & Validation.
 * 
 * Defines schema validation for driver-submitted road hazards (speed breakers, pothole, sharp curve, accident).
 */

export type HazardType =
  | 'SPEED_BREAKER'
  | 'SHARP_CURVE'
  | 'HAIRPIN'
  | 'ACCIDENT_ZONE'
  | 'ROAD_HAZARD'
  | 'SCHOOL_ZONE';

export interface HazardReportFormData {
  hazardType: HazardType;
  description: string;
  severity: 'low' | 'medium' | 'high';
  latitude: number;
  longitude: number;
  timestamp: number;
}

export function validateHazardReport(data: Partial<HazardReportFormData>): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!data.hazardType) {
    errors.hazardType = 'Hazard type is required';
  }
  if (!data.description || data.description.length < 3) {
    errors.description = 'Description must be at least 3 characters';
  }
  if (data.latitude === undefined || data.latitude < -90 || data.latitude > 90) {
    errors.latitude = 'Valid latitude (-90 to 90) is required';
  }
  if (data.longitude === undefined || data.longitude < -180 || data.longitude > 180) {
    errors.longitude = 'Valid longitude (-180 to 180) is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
