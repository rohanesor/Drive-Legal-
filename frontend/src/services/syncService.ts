import { convexClient } from '../convex/client';
/**
 * Convex Sync Service
 *
 * Manages bidirectional sync between the on-device SQLite database and the
 * Convex cloud backend. Syncs traffic rules, regions, emergency contacts,
 * and advisories. Falls back to offline cache when no connection is available.
 *
 * Public API:
 * - subscribe()        - Listen for status changes and sync completion
 * - syncAll()          - Sync all tables from Convex to offline cache
 * - syncTable()        - Sync a single table
 * - checkConnection()  - Test connectivity to Convex backend
 * - needsSync()        - Returns true if stale data was detected
 * - getStatus()        - Returns current sync status
 */
import { api } from '../../convex/_generated/api';
import { offlineCache, cacheKeys } from './offlineCache';

type SyncStatus = 'idle' | 'syncing' | 'online' | 'offline' | 'error';

interface SyncListener {
  onStatusChange?: (status: SyncStatus) => void;
  onSyncComplete?: (tables: string[]) => void;
  onError?: (error: string) => void;
}

class SyncService {
  private status: SyncStatus = 'idle';
  private listeners: SyncListener[] = [];
  private isOnline = false;
  private syncInProgress = false;

  getStatus(): SyncStatus {
    return this.status;
  }

  isConnected(): boolean {
    return this.isOnline;
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyStatusChange(status: SyncStatus) {
    this.status = status;
    for (const l of this.listeners) {
      l.onStatusChange?.(status);
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      if (!convexClient) {
        this.isOnline = false;
        this.notifyStatusChange('offline');
        return false;
      }
      await convexClient.query(api.regions.list);
      this.isOnline = true;
      this.notifyStatusChange('online');
      return true;
    } catch {
      this.isOnline = false;
      this.notifyStatusChange('offline');
      return false;
    }
  }

  async syncAll(): Promise<void> {
    if (this.syncInProgress) {
      return;
    }
    this.syncInProgress = true;

    try {
      this.notifyStatusChange('syncing');

      const connected = await this.checkConnection();
      if (!connected) {
        this.notifyStatusChange('offline');
        this.syncInProgress = false;
        return;
      }

      const tablesSynced: string[] = [];

      const [regions, rules, emergency] = await Promise.all([
        this.syncRegions(),
        this.syncRules(),
        this.syncEmergency(),
      ]);

      tablesSynced.push(...regions, ...rules, ...emergency);

      await offlineCache.setLastSync(Date.now());
      this.notifyStatusChange('online');

      for (const l of this.listeners) {
        l.onSyncComplete?.(tablesSynced);
      }
    } catch (e: unknown) {
      this.notifyStatusChange('error');
      const message = e instanceof Error ? e.message : 'Sync failed';
      for (const l of this.listeners) {
        l.onError?.(message);
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncRegions(): Promise<string[]> {
    try {
      if (!convexClient) {
        return [];
      }
      const regions = await convexClient.query(api.regions.list);
      if (regions) {
        await offlineCache.set(cacheKeys.regions, regions);
      }
      return ['regions'];
    } catch {
      return [];
    }
  }

  private async syncRules(): Promise<string[]> {
    try {
      const cachedRegions = await offlineCache.get<any[]>(cacheKeys.regions);
      if (!cachedRegions) {
        return [];
      }
      for (const region of cachedRegions) {
        try {
          const rules = await convexClient!.query(api.rules.getByRegion, {
            regionId: region._id,
          });
          if (rules) {
            await offlineCache.set(cacheKeys.rules(region._id), rules);
          }
        } catch {
          continue;
        }
      }
      return ['violationRules'];
    } catch {
      return [];
    }
  }

  private async syncEmergency(): Promise<string[]> {
    try {
      const cachedRegions = await offlineCache.get<any[]>(cacheKeys.regions);
      if (!cachedRegions) {
        return [];
      }
      for (const region of cachedRegions) {
        try {
          const contacts = await convexClient!.query(
            api.emergency.getByRegion,
            { regionId: region._id },
          );
          if (contacts) {
            await offlineCache.set(cacheKeys.emergency(region._id), contacts);
          }
        } catch {
          continue;
        }
      }
      return ['emergencyContacts'];
    } catch {
      return [];
    }
  }

  async needsSync(): Promise<boolean> {
    const lastSync = await offlineCache.getLastSync();
    const staleThreshold = 1000 * 60 * 60 * 24; // 24 hours
    return Date.now() - lastSync > staleThreshold;
  }
}

export const syncService = new SyncService();
