import AsyncStorage from '@react-native-async-storage/async-storage';
import { assetService } from '../../frontend/src/services/assetService';
import { BOOTSTRAP_MANIFEST, S3_BUCKET_URL } from '../../frontend/src/constants/assets';

jest.mock('@react-native-async-storage/async-storage', () => {
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    }
  };
});

describe('AssetService Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('should fetch remote manifest from S3 successfully', async () => {
    const mockManifest = {
      manifestVersion: 2,
      updatedAt: 1787000000000,
      assets: [
        {
          name: 'drivelegal.db',
          version: '1.1.0',
          type: 'sqlite_db',
          size: 5600000,
          checksum: 'abc123hash',
          downloadUrl: `${S3_BUCKET_URL}/data/drivelegal.db`,
          updatedAt: 1787000000000,
        }
      ]
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockManifest,
    });

    const manifest = await assetService.getRemoteManifest();
    expect(manifest.manifestVersion).toBe(2);
    expect(manifest.assets.length).toBe(1);
    expect(manifest.assets[0].name).toBe('drivelegal.db');
  });

  it('should fall back to bootstrap manifest if fetch fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network disconnected'));

    const manifest = await assetService.getRemoteManifest();
    expect(manifest.manifestVersion).toBe(BOOTSTRAP_MANIFEST.manifestVersion);
    expect(manifest.assets.length).toBe(BOOTSTRAP_MANIFEST.assets.length);
  });

  it('should read local manifest from storage', async () => {
    const mockLocalManifest = {
      manifestVersion: 1,
      updatedAt: 1786968000000,
      assets: []
    };

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockLocalManifest));

    const local = await assetService.getLocalManifest();
    expect(local.manifestVersion).toBe(1);
    expect(local.assets.length).toBe(0);
  });

  it('should sync and download assets if local cache is missing or stale', async () => {
    // Mock local manifest showing no assets cached (empty manifest)
    const emptyLocalManifest = {
      manifestVersion: 1,
      updatedAt: 1786968000000,
      assets: []
    };
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(emptyLocalManifest));

    // Mock remote manifest having 1 new asset
    const remoteManifest = {
      manifestVersion: 1,
      updatedAt: 1786968000000,
      assets: [
        {
          name: 'drivelegal.db',
          version: '1.0.0',
          type: 'sqlite_db',
          size: 5400000,
          checksum: 'd1982a7fec01a24d293cf62145e31c7d23d8c11e3b0c44298fc1c149afbf623',
          downloadUrl: `${S3_BUCKET_URL}/data/drivelegal.db`,
          updatedAt: 1786968000000,
        }
      ]
    };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => remoteManifest,
    });

    const mockProgress = jest.fn();
    const synced = await assetService.syncAssets(mockProgress);

    expect(synced.length).toBe(1);
    expect(synced[0]).toBe('drivelegal.db');
    expect(mockProgress).toHaveBeenCalled();
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });
});
