import { DatasetManager } from '../../frontend/src/modules/dataset-management/DatasetManager';
import { DatasetValidator } from '../../frontend/src/modules/dataset-management/DatasetValidator';
import { DatasetManifest } from '../../frontend/src/modules/dataset-management/types';
import * as crypto from 'crypto';

describe('Offline Data & Intelligence Update System (P2.14)', () => {
  let manager: DatasetManager;
  let sampleData: any;
  let sampleManifest: DatasetManifest;

  beforeEach(() => {
    manager = new DatasetManager();
    sampleData = { region: 'Chennai', segments: ['rd_1', 'rd_2'] };

    const checksum = crypto.createHash('sha256').update(JSON.stringify(sampleData)).digest('hex');

    sampleManifest = {
      datasetId: 'maps',
      name: 'Chennai Map Update',
      version: '2.0.0',
      schemaVersion: '1.0',
      createdAt: Date.now(),
      size: 4096,
      checksum,
      signature: 'sig_google-key',
      region: 'IN-TN',
      dependencies: [],
      minimumAppVersion: '1.0.0',
      changes: ['Added Main St directions'],
    };
  });

  test('1. DatasetManager installs valid package, invalidates cache and exposes health status', async () => {
    const success = await manager.installDatasetPackage(sampleManifest, sampleData);
    expect(success).toBe(true);

    const health = manager.getDatasetHealth('maps');
    expect(health.status).toBe('ACTIVE');
    expect(health.version).toBe('2.0.0');

    // Verification of downstream cache invalidation log
    const logs = manager.getCacheInvalidations();
    expect(logs).toContain('route_cache_invalidated');
  });

  test('2. DatasetValidator rejects corrupted checksum packages', async () => {
    // Modify data to corrupt checksum
    const corruptedData = { ...sampleData, segments: ['corrupted'] };
    const success = await manager.installDatasetPackage(sampleManifest, corruptedData);
    expect(success).toBe(false);

    // Verify rollback to baseline map (1.0.0)
    const health = manager.getDatasetHealth('maps');
    expect(health.status).toBe('ROLLED_BACK');
    expect(health.version).toBe('1.0.0');
  });

  test('3. DatasetValidator rejects invalid publisher signatures', async () => {
    const invalidManifest = { ...sampleManifest, signature: 'untrusted-signature' };
    const success = await manager.installDatasetPackage(invalidManifest, sampleData);
    expect(success).toBe(false);
  });

  test('4. Dependency resolution checks constraint versions', () => {
    const activeVersions = new Map<string, string>();
    activeVersions.set('maps', '2.0.0');

    const manifestWithDep: DatasetManifest = {
      ...sampleManifest,
      datasetId: 'risk-config',
      dependencies: ['maps:>=2.0.0'],
    };

    const validDep = DatasetValidator.validateDependencies(manifestWithDep, activeVersions);
    expect(validDep).toBe(true);

    // Outdated version constraint
    activeVersions.set('maps', '1.0.0');
    const invalidDep = DatasetValidator.validateDependencies(manifestWithDep, activeVersions);
    expect(invalidDep).toBe(false);
  });

  test('5. USB Import updates datasets offline without internet connection', async () => {
    const success = await manager.importFromUSB({
      manifest: sampleManifest,
      data: sampleData,
    });
    expect(success).toBe(true);

    const health = manager.getDatasetHealth('maps');
    expect(health.status).toBe('ACTIVE');
  });
});
