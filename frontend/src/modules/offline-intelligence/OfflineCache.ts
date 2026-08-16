import * as crypto from 'crypto';

export class OfflineCache {
  private cache: Map<string, { data: any; checksum: string }> = new Map();

  set(key: string, data: any): void {
    const checksum = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    this.cache.set(key, { data, checksum });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const currentChecksum = crypto.createHash('sha256').update(JSON.stringify(entry.data)).digest('hex');
    if (currentChecksum !== entry.checksum) {
      return null;
    }
    return entry.data;
  }

  setWithVerification(key: string, data: any, expectedChecksum: string): boolean {
    const checksum = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    if (checksum !== expectedChecksum) {
      return false;
    }
    this.cache.set(key, { data, checksum });
    return true;
  }
}
export default OfflineCache;
