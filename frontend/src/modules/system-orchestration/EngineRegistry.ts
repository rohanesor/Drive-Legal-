import { EngineHealth, EngineState } from './types';

export class EngineRegistry {
  private engines: Map<string, EngineHealth> = new Map();

  register(engineId: string, version: string, dependencies: string[]): void {
    this.engines.set(engineId, {
      engineId,
      state: 'STOPPED',
      version,
      dependencies,
      lastHeartbeat: Date.now(),
    });
  }

  updateState(engineId: string, state: EngineState, error?: string): void {
    const health = this.engines.get(engineId);
    if (health) {
      health.state = state;
      health.lastHeartbeat = Date.now();
      health.lastError = error;
    }
  }

  heartbeat(engineId: string): void {
    const health = this.engines.get(engineId);
    if (health) {
      health.lastHeartbeat = Date.now();
    }
  }

  getEngineHealth(engineId: string): EngineHealth | undefined {
    return this.engines.get(engineId);
  }

  getAllEngineHealth(): EngineHealth[] {
    return Array.from(this.engines.values());
  }

  reset(): void {
    this.engines.clear();
  }
}
export default EngineRegistry;
