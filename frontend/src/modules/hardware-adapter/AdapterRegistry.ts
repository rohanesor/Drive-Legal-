import { HardwareAdapter } from './types';

export class AdapterRegistry {
  private static adapters: Map<string, HardwareAdapter> = new Map();

  static registerAdapter(adapter: HardwareAdapter): void {
    if (this.adapters.has(adapter.id)) {
      throw new Error(`Duplicate Adapter ID: ${adapter.id} is already registered.`);
    }
    this.adapters.set(adapter.id, adapter);
  }

  static unregisterAdapter(id: string): void {
    this.adapters.delete(id);
  }

  static getAdapter(id: string): HardwareAdapter | undefined {
    return this.adapters.get(id);
  }

  static listAdapters(): HardwareAdapter[] {
    return Array.from(this.adapters.values());
  }

  static getAdaptersByType(type: string): HardwareAdapter[] {
    return this.listAdapters().filter((a) => a.type === type);
  }

  static clear(): void {
    this.adapters.clear();
  }
}
export default AdapterRegistry;
