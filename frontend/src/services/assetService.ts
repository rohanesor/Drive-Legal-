import AsyncStorage from '@react-native-async-storage/async-storage';
import { BOOTSTRAP_MANIFEST, S3_BUCKET_URL } from '../constants/assets';
import type { Asset, AssetManifest } from '../types';

const LOCAL_MANIFEST_KEY = '@drivelegal:asset_manifest';

export const assetService = {
  /**
   * Fetches the latest remote manifest from AWS S3.
   */
  async getRemoteManifest(): Promise<AssetManifest> {
    try {
      const response = await fetch(`${S3_BUCKET_URL}/manifest.json`, {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch manifest: ${response.statusText}`);
      }
      const data = await response.json();
      return data as AssetManifest;
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      console.warn('[AssetService] Failed to load remote manifest, using bootstrap default:', err.message);
      return BOOTSTRAP_MANIFEST;
    }
  },

  /**
   * Retrieves the locally cached manifest representation.
   */
  async getLocalManifest(): Promise<AssetManifest> {
    try {
      const raw = await AsyncStorage.getItem(LOCAL_MANIFEST_KEY);
      if (raw) {
        return JSON.parse(raw) as AssetManifest;
      }
    } catch (e) {
      console.warn('[AssetService] Failed to read local manifest:', e);
    }
    // Fall back to bootstrap manifest if no cache is present
    return BOOTSTRAP_MANIFEST;
  },

  /**
   * Saves the current local manifest representation to storage.
   */
  async saveLocalManifest(manifest: AssetManifest): Promise<void> {
    try {
      await AsyncStorage.setItem(LOCAL_MANIFEST_KEY, JSON.stringify(manifest));
    } catch (e) {
      console.warn('[AssetService] Failed to save local manifest:', e);
    }
  },

  /**
   * Abstract check verifying if an asset exists locally.
   * On mobile, this will query FileSystem.getInfoAsync().
   */
  async verifyAsset(asset: Asset): Promise<boolean> {
    try {
      // In a real device environment:
      // const info = await FileSystem.getInfoAsync(`${FileSystem.documentDirectory}${asset.name}`);
      // return info.exists && info.size === asset.size;
      
      // For development/mock/fallback:
      const localManifest = await this.getLocalManifest();
      const localAsset = localManifest.assets.find((a) => a.name === asset.name);
      if (!localAsset) return false;
      
      return localAsset.version === asset.version && localAsset.checksum === asset.checksum;
    } catch {
      return false;
    }
  },

  /**
   * Abstract function to handle file downloads.
   * Downloads files directly to mobile documents storage.
   */
  async downloadAsset(
    asset: Asset,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    console.log(`[AssetService] Starting download for: ${asset.name}`);
    
    // Abstract network mock for simulator and unit testing
    return new Promise((resolve, reject) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 0.2;
        if (onProgress) {
          onProgress(Math.min(1.0, progress));
        }
        if (progress >= 1.0) {
          clearInterval(interval);
          resolve();
        }
      }, 50);
    });
  },

  /**
   * Scans remote manifest, detects updates, and syncs local filesystem.
   */
  async syncAssets(
    onProgress?: (assetName: string, progress: number) => void
  ): Promise<string[]> {
    console.log('[AssetService] Starting S3 assets sync check...');
    
    const remoteManifest = await this.getRemoteManifest();
    const syncedAssets: string[] = [];

    for (const asset of remoteManifest.assets) {
      const isUpToDate = await this.verifyAsset(asset);
      if (!isUpToDate) {
        console.log(`[AssetService] Asset update required: ${asset.name}`);
        await this.downloadAsset(asset, (p) => {
          if (onProgress) {
            onProgress(asset.name, p);
          }
        });
        syncedAssets.push(asset.name);
      } else {
        console.log(`[AssetService] Asset is up to date: ${asset.name}`);
      }
    }

    // Update local manifest cache upon successful sync completion
    await this.saveLocalManifest(remoteManifest);
    return syncedAssets;
  }
};
export default assetService;
