import { DatasetState } from './types';
import { DatasetRegistry } from './DatasetRegistry';

export class DatasetInstaller {
  private registry: DatasetRegistry;
  private stagingDirectory: Map<string, any> = new Map();
  private activeStore: Map<string, any> = new Map();

  constructor(registry: DatasetRegistry) {
    this.registry = registry;
  }

  stage(datasetId: string, version: string, data: any): void {
    const key = `${datasetId}_${version}`;
    this.stagingDirectory.set(key, data);
    this.registry.updateStatus(datasetId, 'STAGED');
  }

  activate(datasetId: string, version: string): void {
    const key = `${datasetId}_${version}`;
    const data = this.stagingDirectory.get(key);
    if (!data) {
      throw new Error(`Cannot activate version ${version} of dataset ${datasetId}. Not staged.`);
    }

    this.activeStore.set(datasetId, data);
    this.registry.updateActiveVersion(datasetId, version);
    this.registry.updateStatus(datasetId, 'ACTIVE');

    this.stagingDirectory.delete(key);
  }

  getActiveData(datasetId: string): any | undefined {
    return this.activeStore.get(datasetId);
  }

  rollback(datasetId: string, previousVersion: string, previousData: any): void {
    this.activeStore.set(datasetId, previousData);
    this.registry.updateActiveVersion(datasetId, previousVersion);
    this.registry.updateStatus(datasetId, 'ROLLED_BACK');
  }

  garbageCollect(datasetId: string, keepVersion: string): void {
    const entry = this.registry.getEntry(datasetId);
    if (entry) {
      entry.installedVersions = entry.installedVersions.filter((v) => v === keepVersion);
    }
  }

  reset(): void {
    this.stagingDirectory.clear();
    this.activeStore.clear();
  }
}
export default DatasetInstaller;
