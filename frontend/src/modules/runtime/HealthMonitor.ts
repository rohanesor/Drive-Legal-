import { SubsystemHealth, DependencyCriticality } from './types';

export class HealthMonitor {
  private healthStates: Map<string, SubsystemHealth> = new Map();
  private criticalities: Map<string, DependencyCriticality> = new Map();

  constructor() {
    this.criticalities.set('safety', 'CRITICAL');
    this.criticalities.set('legal', 'CRITICAL');
    this.criticalities.set('alerts', 'CRITICAL');
    this.criticalities.set('runtime', 'CRITICAL');
    
    this.criticalities.set('navigation', 'IMPORTANT');
    this.criticalities.set('gps', 'IMPORTANT');
    
    this.criticalities.set('voice', 'OPTIONAL');
    this.criticalities.set('llm', 'OPTIONAL');

    for (const sub of this.criticalities.keys()) {
      this.healthStates.set(sub, 'HEALTHY');
    }
  }

  setSubsystemHealth(subsystem: string, state: SubsystemHealth): void {
    if (!this.criticalities.has(subsystem)) {
      this.criticalities.set(subsystem, 'OPTIONAL');
    }
    this.healthStates.set(subsystem, state);
  }

  getSubsystemHealth(subsystem: string): SubsystemHealth {
    return this.healthStates.get(subsystem) || 'HEALTHY';
  }

  getAllHealth(): Record<string, SubsystemHealth> {
    const result: Record<string, SubsystemHealth> = {};
    for (const [sub, state] of this.healthStates.entries()) {
      result[sub] = state;
    }
    return result;
  }

  evaluateRuntimeStatus(): 'HEALTHY' | 'DEGRADED' | 'FAILED' {
    let hasFailedCritical = false;
    let hasDegradedOrFailedImportant = false;

    for (const [sub, state] of this.healthStates.entries()) {
      const criticality = this.criticalities.get(sub) || 'OPTIONAL';
      
      if (criticality === 'CRITICAL' && state === 'UNAVAILABLE') {
        hasFailedCritical = true;
      }
      if (criticality === 'IMPORTANT' && (state === 'UNAVAILABLE' || state === 'DEGRADED')) {
        hasDegradedOrFailedImportant = true;
      }
    }

    if (hasFailedCritical) {
      return 'FAILED';
    }
    if (hasDegradedOrFailedImportant) {
      return 'DEGRADED';
    }
    return 'HEALTHY';
  }
}
export default HealthMonitor;
