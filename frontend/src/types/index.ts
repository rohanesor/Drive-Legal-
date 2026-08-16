// Re-export all shared domain types. Importers should use `import type { ... } from '@/types'`.

export type { GPSCoords, GeoInfo, CachedLocation } from './location';
export type { SpeedLimitResult, StateDefaultSpeedLimit } from './speedLimits';
export type {
  EmergencyLocation,
  EmergencyLocationType,
  GeocodedAddress,
} from './emergency';
export type {
  MapLocation,
  MapMarker,
  MapMarkerType,
  MapZone,
  MapLine,
} from './map';
export type { ChatMessageItem, Message } from './chat';
export type { ZoneAlert } from './alerts';
export type { SettingsState } from './settings';
export type {
  Severity,
  SyncStatus,
  IconComponent,
  AppMode,
  AppLanguage,
} from './common';
export type {
  AppNavigationProp,
  AppRouteName,
  MobileRouteName,
  CarRouteName,
} from './navigation';
export type { Route, RouteStep, RouteSearchParams } from './routing';
export type { Asset, AssetType, AssetManifest } from './assets';
export type { RoutingProvider } from './routingProvider';
