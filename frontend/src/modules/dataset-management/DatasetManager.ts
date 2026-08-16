import { DatasetManifest, DatasetHealth } from './types';
import { DatasetRegistry } from './DatasetRegistry';
import { DatasetInstaller } from './DatasetInstaller';
import { DatasetValidator } from './DatasetValidator';

export class DatasetManager {
  private registry = new DatasetRegistry();
  private installer: DatasetInstaller;
  private activeVersions: Map<string, string> = new Map();
  private cacheInvalidationLogs: string[] = [];

  constructor() {
    this.installer = new DatasetInstaller(this.registry);
    this.initBundledBaseline();
  }

  private initBundledBaseline(): void {
    const baselineMap = { region: 'global-baseline', mapDataVersion: '1.0' };
    this.registry.register({
      datasetId: 'maps',
      activeVersion: '1.0.0',
      installedVersions: ['1.0.0'],
      status: 'ACTIVE',
      lastUpdated: Date.now(),
      region: 'global',
    });
    this.installer.stage('maps', '1.0.0', baselineMap);
    this.installer.activate('maps', '1.0.0');
    this.activeVersions.set('maps', '1.0.0');
  }

  async installDatasetPackage(manifest: DatasetManifest, data: any): Promise<boolean> {
    const previousVersion = this.activeVersions.get(manifest.datasetId) || '1.0.0';
    const previousData = this.installer.getActiveData(manifest.datasetId);

    try {
      this.registry.updateStatus(manifest.datasetId, 'VALIDATING');

      if (!DatasetValidator.validateIntegrity(data, manifest.checksum)) {
        throw new Error('Integrity Checksum mismatch.');
      }

      if (!DatasetValidator.validateSignature(manifest.signature, 'google-key')) {
        throw new Error('Invalid publisher signature verification failed.');
      }

      if (!DatasetValidator.validateDependencies(manifest, this.activeVersions)) {
        throw new Error('Unresolved dependencies constraints.');
      }

      this.installer.stage(manifest.datasetId, manifest.version, data);
      this.installer.activate(manifest.datasetId, manifest.version);
      this.activeVersions.set(manifest.datasetId, manifest.version);
      this.invalidateDownstreamCache(manifest.datasetId);

      return true;
    } catch (err: any) {
      console.error(`[DatasetManager] Installation transaction failed. Restoring rollback state. Error: ${err.message}`);
      this.installer.rollback(manifest.datasetId, previousVersion, previousData);
      return false;
    }
  }

  async importFromUSB(filePackage: { manifest: DatasetManifest; data: any }): Promise<boolean> {
    return this.installDatasetPackage(filePackage.manifest, filePackage.data);
  }

  getDatasetHealth(datasetId: string): DatasetHealth {
    const entry = this.registry.getEntry(datasetId);
    if (!entry) {
      return {
        datasetId,
        version: '0.0.0',
        integrity: false,
        compatibility: false,
        freshness: 'UNKNOWN',
        trust: 'REJECTED',
        status: 'NOT_INSTALLED',
        lastValidated: Date.now(),
        errors: ['Dataset entry missing in registry.'],
      };
    }

    return {
      datasetId,
      version: entry.activeVersion,
      integrity: true,
      compatibility: true,
      freshness: 'CURRENT',
      trust: 'TRUSTED',
      status: entry.status,
      lastValidated: Date.now(),
      errors: [],
    };
  }

  getCacheInvalidations(): string[] {
    return this.cacheInvalidationLogs;
  }

  reset(): void {
    this.registry.clear();
    this.installer.reset();
    this.cacheInvalidationLogs = [];
    this.initBundledBaseline();
  }

  private invalidateDownstreamCache(datasetId: string): void {
    if (datasetId === 'maps') {
      this.cacheInvalidationLogs.push('route_cache_invalidated');
    } else if (datasetId === 'legal') {
      this.cacheInvalidationLogs.push('legal_findings_cache_invalidated');
    }
  }
}
export default DatasetManager;
