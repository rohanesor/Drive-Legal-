import { TrafficRule } from './types';

export const COMPLIANCE_TOLERANCES = {
  SPEED_PERSISTENCE_LIMIT_SECONDS: 3.0, // GPS noise filter duration
  SPEEDING_MARGIN_KMH: 3.0, // Minor speed tolerance
  CONFIDENCE_THRESHOLD: 0.65, // Below this, flag as Potential or Warning rather than Confirmed
};

export const DEFAULT_TRAFFIC_RULES: TrafficRule[] = [
  {
    id: 'RULE_SPEED_LIMIT_STANDARD',
    version: 1,
    category: 'SPEED_LIMIT',
    jurisdiction: 'IN.TN',
    effectiveFrom: '2026-01-01T00:00:00Z',
    enabled: true,
    severity: 'HIGH',
    source: 'Motor Vehicles Act Section 112',
    explanation: 'Vehicle speed must not exceed the posted speed limit of the segment.',
  },
  {
    id: 'RULE_NO_ENTRY_STANDARD',
    version: 1,
    category: 'NO_ENTRY',
    jurisdiction: 'IN',
    effectiveFrom: '2026-01-01T00:00:00Z',
    enabled: true,
    severity: 'CRITICAL',
    source: 'Motor Vehicles Act Section 115',
    explanation: 'Entering a road closed to traffic or driving in a prohibited direction is forbidden.',
  },
  {
    id: 'RULE_ONE_WAY_STANDARD',
    version: 1,
    category: 'ONE_WAY',
    jurisdiction: 'IN',
    effectiveFrom: '2026-01-01T00:00:00Z',
    enabled: true,
    severity: 'HIGH',
    source: 'Motor Vehicles Rules Section 17',
    explanation: 'Drivers must proceed only along the designated direction of a one-way street.',
  },
  {
    id: 'RULE_NO_PARKING_STANDARD',
    version: 1,
    category: 'NO_PARKING',
    jurisdiction: 'IN',
    effectiveFrom: '2026-01-01T00:00:00Z',
    enabled: true,
    severity: 'MEDIUM',
    source: 'Motor Vehicles Act Section 122',
    explanation: 'Vehicles must not be parked or abandoned in designated no-parking areas.',
  },
  {
    id: 'RULE_VEHICLE_RESTRICTION_HEAVY',
    version: 1,
    category: 'VEHICLE_RESTRICTION',
    jurisdiction: 'IN.TN.Coimbatore',
    effectiveFrom: '2026-01-01T00:00:00Z',
    enabled: true,
    severity: 'HIGH',
    source: 'Coimbatore City Traffic Police Order',
    explanation: 'Heavy commercial vehicles are restricted on central urban city streets.',
  },
  {
    id: 'RULE_TIME_RESTRICTION_ACTIVE',
    version: 1,
    category: 'TIME_RESTRICTION',
    jurisdiction: 'IN.TN',
    effectiveFrom: '2026-01-01T00:00:00Z',
    enabled: true,
    severity: 'MEDIUM',
    source: 'TN Safety Notification',
    explanation: 'Road segment has restricted access during designated hours.',
  },
];
