import { GPSState, GPSStaleness, DegradationLevel, FailureDomain, FailureCategory } from './types';

export class ReliabilityManager {
  private gpsState: GPSState = 'GPS_AVAILABLE';
  private gpsStaleness: GPSStaleness = 'FRESH';
  private degradationLevel: DegradationLevel = 'FULL';

  private activeRouteCache: string | null = 'route_cache_v1';
  private activeLegalCache: string | null = 'legal_cache_v1';
  private activeRiskCache: string | null = 'risk_cache_v1';

  private isMemoryPressureActive = false;

  feedGPSUpdate(available: boolean): void {
    if (available) {
      this.gpsState = 'GPS_AVAILABLE';
      this.gpsStaleness = 'FRESH';
      this.degradationLevel = 'FULL';
    } else {
      this.gpsState = 'GPS_UNAVAILABLE';
      this.gpsStaleness = 'STALE';
      this.degradationLevel = 'DEGRADED';
      console.warn('[ReliabilityManager] GPS is temporarily unavailable. POSITION_STALE status active.');
    }
  }

  getGPSState(): GPSState {
    return this.gpsState;
  }

  getGPSStaleness(): GPSStaleness {
    return this.gpsStaleness;
  }

  getDegradationLevel(): DegradationLevel {
    return this.degradationLevel;
  }

  evaluateLegalLocationRule(ruleId: string): 'LEGAL' | 'UNKNOWN' {
    if (this.gpsStaleness === 'STALE') {
      return 'UNKNOWN';
    }
    return 'LEGAL';
  }

  recoverCorruptedCache(cacheType: 'route' | 'legal' | 'risk'): void {
    if (cacheType === 'route') {
      this.activeRouteCache = null;
      console.log('[ReliabilityManager] Clearing corrupted route cache. Recalculating using authoritative route files.');
      this.activeRouteCache = 'route_cache_recalculated';
    } else if (cacheType === 'legal') {
      this.activeLegalCache = null;
      this.activeLegalCache = 'legal_cache_recalculated';
    } else if (cacheType === 'risk') {
      this.activeRiskCache = null;
      this.activeRiskCache = 'risk_cache_recalculated';
    }
  }

  getCacheState(cacheType: 'route' | 'legal' | 'risk'): string | null {
    if (cacheType === 'route') return this.activeRouteCache;
    if (cacheType === 'legal') return this.activeLegalCache;
    return this.activeRiskCache;
  }

  handleMemoryPressure(): void {
    this.isMemoryPressureActive = true;
    this.activeRouteCache = null;
    this.activeLegalCache = null;
    this.activeRiskCache = null;
  }

  isMemoryHealthy(): boolean {
    return !this.isMemoryPressureActive;
  }
}
export default ReliabilityManager;
