import { HardwareAdapter, AdapterHealth } from './types';

export class AdapterHealthMonitor {
  private healthCache: Map<string, AdapterHealth> = new Map();
  private reconnectRetries: Map<string, number> = new Map();
  private maxRetries = 5;

  trackHealth(adapter: HardwareAdapter, health: AdapterHealth): void {
    this.healthCache.set(adapter.id, health);
  }

  getHealth(adapterId: string): AdapterHealth | undefined {
    return this.healthCache.get(adapterId);
  }

  attemptReconnect(adapterId: string, reconnectCallback: () => Promise<void>): Promise<boolean> {
    const current = this.reconnectRetries.get(adapterId) || 0;
    if (current >= this.maxRetries) {
      console.error(`[AdapterHealthMonitor] Reconnect failed. Max retries exceeded for: ${adapterId}`);
      return Promise.resolve(false);
    }

    const backoffMs = Math.pow(2, current) * 100;
    this.reconnectRetries.set(adapterId, current + 1);

    return new Promise((resolve) => {
      setTimeout(async () => {
        try {
          await reconnectCallback();
          this.reconnectRetries.set(adapterId, 0);
          resolve(true);
        } catch {
          resolve(false);
        }
      }, backoffMs);
    });
  }
}
export default AdapterHealthMonitor;
