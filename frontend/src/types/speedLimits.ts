export interface SpeedLimitResult {
  speedLimit: number; // km/h
  source: 'osm' | 'default' | 'cached';
  roadType?: string; // 'motorway', 'primary', 'residential', etc.
  confidence: 'high' | 'medium' | 'low';
}

export interface StateDefaultSpeedLimit {
  stateCode: string;
  urban: number; // Default urban speed limit (km/h)
  rural: number; // Default rural speed limit (km/h)
  highway: number; // Default highway speed limit (km/h)
  expressway: number; // Default expressway speed limit (km/h)
}
