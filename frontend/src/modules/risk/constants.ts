export interface RiskWeights {
  SPEEDING: number;
  HARSH_BRAKING: number;
  RAPID_ACCELERATION: number;
  HIGH_RISK_ROAD: number;
  INTERSECTION: number;
  SCHOOL_ZONE: number;
  PEDESTRIAN_ZONE: number;
  RESTRICTED_ROAD: number;
  LOW_VISIBILITY: number;
  WEATHER_RISK: number;
  REPEATED_RISK_BEHAVIOR: number;
}

export const DEFAULT_RISK_WEIGHTS: RiskWeights = {
  SPEEDING: 0.25,
  HARSH_BRAKING: 0.15,
  RAPID_ACCELERATION: 0.10,
  HIGH_RISK_ROAD: 0.12,
  INTERSECTION: 0.08,
  SCHOOL_ZONE: 0.20,
  PEDESTRIAN_ZONE: 0.18,
  RESTRICTED_ROAD: 0.15,
  LOW_VISIBILITY: 0.10,
  WEATHER_RISK: 0.08,
  REPEATED_RISK_BEHAVIOR: 0.15,
};

export const RISK_THRESHOLDS = {
  HARSH_BRAKING: 3.5, // m/s^2
  RAPID_ACCELERATION: 3.0, // m/s^2
  HEADING_CHANGE_RATE: 40.0, // degrees per second (sudden swerving)
  SPEEDING_MINOR: 5.0, // km/h above speed limit
  SPEEDING_MAJOR: 20.0, // km/h above speed limit
  LOW_VISIBILITY: 200, // meters
  POOR_SAFETY_SCORE: 70, // route safety score below this is high-risk road
};

export const RISK_LEVEL_THRESHOLDS = {
  LOW: 15,
  MODERATE: 40,
  HIGH: 70,
};

export const RISK_DECAY_RATE = 4; // points to drop per tick/second if no active violations
export const DEFAULT_SMOOTHING_ALPHA = 0.25; // standard filter coefficient
export const REACTIVE_SMOOTHING_ALPHA = 0.80; // reactive coefficient when dangerous signal jumps
