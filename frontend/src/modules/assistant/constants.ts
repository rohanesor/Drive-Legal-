import { AssistantPreferences, AlertPriority } from './types';

export const ASSISTANT_COOLDOWNS_MS = {
  SPEED_LIMIT_EXCEEDED: 30000,
  SPEED_LIMIT_WARNING: 15000,
  RESTRICTED_ZONE_APPROACHING: 60000,
  RESTRICTED_ZONE_ENTERED: 10000,
  HIGH_RISK_SEGMENT_APPROACHING: 60000,
  HIGH_RISK_DETECTED: 45000,
  HARSH_BRAKING_DETECTED: 30000,
  DRIVER_SCORE_DROP: 90000,
  SAFER_ROUTE_AVAILABLE: 120000,
  EMERGENCY_DETECTED: 0, // critical: never suppressed
};

export const PRIORITY_WEIGHTS: Record<AlertPriority, number> = {
  CRITICAL: 5,
  HIGH: 4,
  MEDIUM: 3,
  LOW: 2,
  INFO: 1,
};

export const DEFAULT_ASSISTANT_PREFERENCES: AssistantPreferences = {
  voiceEnabled: true,
  alertFrequency: 'medium',
  navigationAlerts: true,
  legalAlerts: true,
  safetyAlerts: true,
};
