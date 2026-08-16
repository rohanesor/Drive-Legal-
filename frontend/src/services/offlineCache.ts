/**
 * Offline Cache
 *
 * AsyncStorage-based key-value cache for offline operation. Stores:
 * - rules:            Traffic violation rules
 * - regions:          Jurisdiction/state geometry
 * - emergencyContacts: Nearby emergency locations
 * - advisories:       AI advisories and announcements
 * - settings:         User preferences
 * - lastSync:         Timestamp of last successful Convex sync
 *
 * All data is local to the device and survives app restarts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@drivelegal:';

export const cacheKeys = {
  rules: (regionId: string) => `${CACHE_PREFIX}rules:${regionId}`,
  regions: `${CACHE_PREFIX}regions`,
  emergency: (regionId: string) => `${CACHE_PREFIX}emergency:${regionId}`,
  advisory: (userId: string) => `${CACHE_PREFIX}advisory:${userId}`,
  syncLog: (table: string) => `${CACHE_PREFIX}sync:${table}`,
  user: `${CACHE_PREFIX}user`,
  settings: `${CACHE_PREFIX}settings`,
  lastSync: `${CACHE_PREFIX}lastSync`,
} as const;

export const offlineCache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('offlineCache.set error:', key, e);
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.warn('offlineCache.remove error:', key, e);
    }
  },

  async clearAll(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const scopedKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
      if (scopedKeys.length > 0) {
        await AsyncStorage.multiRemove(scopedKeys);
      }
    } catch (e) {
      console.warn('offlineCache.clearAll error:', e);
    }
  },

  async getLastSync(): Promise<number> {
    const val = await this.get<number>(cacheKeys.lastSync);
    return val ?? 0;
  },

  async setLastSync(timestamp: number): Promise<void> {
    await this.set(cacheKeys.lastSync, timestamp);
  },
};
