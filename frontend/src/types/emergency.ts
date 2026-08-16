export type EmergencyLocationType =
  | 'police'
  | 'hospital'
  | 'fire'
  | 'charging_station'
  | 'rto';

export interface EmergencyLocation {
  id: string;
  type: EmergencyLocationType;
  name: string;
  lat: number;
  lng: number;
  distance: number;
  address: string;
  phone?: string;
}

export interface GeocodedAddress {
  city: string;
  state: string;
  country: string;
}
