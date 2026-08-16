import type { StateDefaultSpeedLimit } from '../types/speedLimits';

// Standard default limits per road category in India (km/h) for LMV / Cars
export const DEFAULT_SPEED_LIMITS: Record<string, StateDefaultSpeedLimit> = {
  TN: { stateCode: 'TN', urban: 50, rural: 80, highway: 100, expressway: 120 },
  KN: { stateCode: 'KN', urban: 50, rural: 80, highway: 100, expressway: 120 },
  AP: { stateCode: 'AP', urban: 50, rural: 80, highway: 100, expressway: 120 },
  KL: { stateCode: 'KL', urban: 50, rural: 70, highway: 85, expressway: 110 }, // Kerala has stricter limits
  MH: { stateCode: 'MH', urban: 50, rural: 80, highway: 100, expressway: 120 },
  DL: { stateCode: 'DL', urban: 50, rural: 70, highway: 90, expressway: 100 }, // Delhi NCT limits
  GJ: { stateCode: 'GJ', urban: 60, rural: 80, highway: 100, expressway: 120 }, // Gujarat allows 60 inside municipal limits
  RJ: { stateCode: 'RJ', urban: 50, rural: 80, highway: 100, expressway: 120 },
  UP: { stateCode: 'UP', urban: 50, rural: 80, highway: 100, expressway: 120 },
  WB: { stateCode: 'WB', urban: 50, rural: 80, highway: 100, expressway: 120 },
  TS: { stateCode: 'TS', urban: 50, rural: 80, highway: 100, expressway: 120 },
  BR: { stateCode: 'BR', urban: 50, rural: 80, highway: 100, expressway: 120 },
  HR: { stateCode: 'HR', urban: 50, rural: 80, highway: 100, expressway: 120 },
  PB: { stateCode: 'PB', urban: 50, rural: 80, highway: 100, expressway: 120 },
  OR: { stateCode: 'OR', urban: 50, rural: 80, highway: 100, expressway: 120 },
  MP: { stateCode: 'MP', urban: 50, rural: 80, highway: 100, expressway: 120 },
  DEFAULT: { stateCode: 'ALL', urban: 50, rural: 80, highway: 100, expressway: 100 }
};

// Mappings for vehicle-type multiplier/adjustments (e.g., motorcycles or heavy trucks have lower speed limits)
export const VEHICLE_LIMIT_ADJUSTMENTS: Record<string, { urban: number; rural: number; highway: number; expressway: number }> = {
  car: { urban: 0, rural: 0, highway: 0, expressway: 0 },
  motorcycle: { urban: -10, rural: -10, highway: -20, expressway: -40 }, // Motorcycle limits: Expressway max 80, Highway max 80
  heavy: { urban: -10, rural: -20, highway: -20, expressway: -40 }      // Heavy trucks: Expressway max 80, Highway max 80
};

// Map OSM highway classification tags to local road categories
export const OSM_HIGHWAY_TO_CATEGORY: Record<string, 'urban' | 'rural' | 'highway' | 'expressway'> = {
  motorway: 'expressway',
  motorway_link: 'expressway',
  trunk: 'highway',
  trunk_link: 'highway',
  primary: 'highway',
  primary_link: 'highway',
  secondary: 'rural',
  secondary_link: 'rural',
  tertiary: 'rural',
  tertiary_link: 'rural',
  residential: 'urban',
  living_street: 'urban',
  unclassified: 'urban',
  service: 'urban',
  pedestrian: 'urban',
  track: 'urban'
};

export const getCategoryFromOsmRoadType = (roadType?: string): 'urban' | 'rural' | 'highway' | 'expressway' => {
  if (!roadType) return 'urban';
  return OSM_HIGHWAY_TO_CATEGORY[roadType.toLowerCase()] || 'urban';
};
