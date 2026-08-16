import { PerformanceConfig } from './types';

export class ResourceGovernor {
  private config: PerformanceConfig;
  private currentMemoryUsageMb = 120;
  private isDegradedModeActive = false;

  constructor(config: PerformanceConfig) {
    this.config = config;
  }

  setMemoryUsage(mb: number): void {
    this.currentMemoryUsageMb = mb;
  }

  evaluateResourcePressure(): { evictCaches: boolean; reduceBackgroundWork: boolean } {
    let evictCaches = false;
    let reduceBackgroundWork = false;

    if (this.currentMemoryUsageMb > this.config.memoryLimitMb) {
      evictCaches = true;
      reduceBackgroundWork = true;
      this.isDegradedModeActive = true;
      console.warn('[ResourceGovernor] Memory limit exceeded. Initiating cache eviction & adaptive degradation.');
    } else {
      this.isDegradedModeActive = false;
    }

    return { evictCaches, reduceBackgroundWork };
  }

  isDegraded(): boolean {
    return this.isDegradedModeActive;
  }
}
export default ResourceGovernor;
