import { DriverContext } from './types';

export class ContextCache {
  private cachedContext?: DriverContext;
  private lastUpdate = 0;
  private cacheTtlMs = 1000; // 1 second real-time cache

  set(context: DriverContext): void {
    this.cachedContext = context;
    this.lastUpdate = Date.now();
  }

  get(): DriverContext | null {
    if (!this.cachedContext) return null;
    
    if (Date.now() - this.lastUpdate > this.cacheTtlMs) {
      this.cachedContext = undefined;
      return null;
    }
    return this.cachedContext;
  }

  invalidate(): void {
    this.cachedContext = undefined;
  }
}
export default ContextCache;
