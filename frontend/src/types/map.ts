export type MapMarkerType =
  | 'police'
  | 'hospital'
  | 'fire'
  | 'rto'
  | 'ev'
  | 'warning'
  | 'border';

export interface MapLocation {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
}

export interface MapMarker {
  id: string;
  type: MapMarkerType;
  name: string;
  lat: number;
  lng: number;
  distance?: number;
  address?: string;
  phone?: string;
}

export interface MapZone {
  id: string;
  type:
    | 'school_zone'
    | 'accident_zone'
    | 'speed_camera'
    | 'tow_zone'
    | 'toll_plaza'
    | 'restricted_zone'
    | 'permitted_parking';
  name: string;
  coords: { lat: number; lng: number }[];
  radius?: number;
  severity: 'low' | 'medium' | 'high';
}

export interface MapLine {
  id: string;
  name: string;
  coords: { lat: number; lng: number }[];
  color: string;
  dashed?: boolean;
}
