export interface GPSCoords {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  timestamp: number;
  speed?: number | null;
  heading?: number | null;
}

export interface GeoInfo {
  city: string;
  district: string;
  state: string;
  stateCode: string;
  country: string;
  postalCode: string;
  confidence: 'high' | 'medium' | 'low';
  source: 'expo' | 'nominatim' | 'cache' | 'fallback';
  rtoCode?: string;
}

export interface CachedLocation {
  coords: GPSCoords;
  geo: GeoInfo;
  timestamp: number;
}
