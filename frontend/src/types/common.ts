import type * as React from 'react';

/**
 * Alert / zone severity. Used by AlertBanner, ZoneAlert, MapZone and the
 * predictive engine. Previously duplicated inline in three places.
 */
export type Severity = 'low' | 'medium' | 'high';

/**
 * Convex sync status. Previously duplicated identically in
 * `store/convexSlice.ts` and `services/syncService.ts`.
 */
export type SyncStatus = 'idle' | 'syncing' | 'online' | 'offline' | 'error';

import type { LucideProps } from 'lucide-react-native';

/**
 * Icon component contract for lucide-react-native icons. Replaces the
 * `Icon: any` field on the Challan calculator's `Violation` interface.
 */
export type IconComponent = React.ComponentType<LucideProps>;

/**
 * Mobile app mode. `auto` lets the app switch based on docking / driving state.
 */
export type AppMode = 'mobile' | 'car';

/**
 * Recognised user languages. Kept in sync with SettingsState.language.
 */
export type AppLanguage = 'en' | 'ta' | 'hi';
