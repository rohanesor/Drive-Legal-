import { DatasetState } from './types';

export interface RegistryEntry {
  datasetId: string;
  activeVersion: string;
  installedVersions: string[];
  status: DatasetState;
  lastUpdated: number;
  region: string;
}

export class DatasetRegistry {
  private entries: Map<string, RegistryEntry> = new Map();

  register(entry: RegistryEntry): void {
    this.entries.set(entry.datasetId, entry);
  }

  getEntry(datasetId: string): RegistryEntry | undefined {
    return this.entries.get(datasetId);
  }

  updateStatus(datasetId: string, status: DatasetState): void {
    const entry = this.entries.get(datasetId);
    if (entry) {
      entry.status = status;
      entry.lastUpdated = Date.now();
    }
  }

  updateActiveVersion(datasetId: string, version: string): void {
    const entry = this.entries.get(datasetId);
    if (entry) {
      entry.activeVersion = version;
      if (!entry.installedVersions.includes(version)) {
        entry.installedVersions.push(version);
      }
      entry.lastUpdated = Date.now();
    }
  }

  listEntries(): RegistryEntry[] {
    return Array.from(this.entries.values());
  }

  clear(): void {
    this.entries.clear();
  }
}
export default DatasetRegistry;
