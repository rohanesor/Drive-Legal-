import { RuntimeState, ContextSnapshot, SystemHealth, SafetyBounds } from './types';
import { EventBus } from './EventBus';
import { EngineRegistry } from './EngineRegistry';
import { AlertManager } from './AlertManager';
import { RecoveryManager } from './RecoveryManager';

export class DriveLegalRuntime {
  private runtimeState: RuntimeState = 'STOPPED';
  private eventBus = new EventBus();
  private registry = new EngineRegistry();
  private alertManager = new AlertManager();
  private recoveryManager = new RecoveryManager();

  private contextVersion = 0;
  private latestAcceptedContextVersion = 0;
  private activeSnapshot: ContextSnapshot | null = null;

  private safetyBounds: SafetyBounds = {
    minWarningDistanceMeters: 100,
    maxAlertCooldownSeconds: 15,
    maxRouteDeviationThresholdMeters: 50,
  };

  private startupSequenceLogs: string[] = [];

  constructor() {
    this.registerEngines();
  }

  private registerEngines(): void {
    this.registry.register('security', '1.0.0', []);
    this.registry.register('datasets', '1.0.0', ['security']);
    this.registry.register('context', '1.0.0', ['datasets']);
    this.registry.register('legal', '1.0.0', ['context']);
    this.registry.register('risk', '1.0.0', ['context']);
    this.registry.register('navigation', '1.0.0', ['context']);
    this.registry.register('driver', '1.0.0', ['context']);
    this.registry.register('voice', '1.0.0', ['driver']);
    this.registry.register('policy', '1.0.0', ['legal', 'risk', 'navigation']);
  }

  async boot(): Promise<void> {
    this.runtimeState = 'BOOTING';
    this.startupSequenceLogs = [];

    const order = ['security', 'datasets', 'context', 'legal', 'risk', 'navigation', 'driver', 'voice', 'policy'];

    for (const engineId of order) {
      this.registry.updateState(engineId, 'STARTING');
      this.startupSequenceLogs.push(`init_${engineId}`);
      this.registry.updateState(engineId, 'READY');
    }

    this.runtimeState = 'READY';
  }

  getStartupLogs(): string[] {
    return this.startupSequenceLogs;
  }

  getRuntimeState(): RuntimeState {
    return this.runtimeState;
  }

  setRuntimeState(state: RuntimeState): void {
    this.runtimeState = state;
  }

  processGPSUpdate(latitude: number, longitude: number, speed: number): void {
    this.contextVersion++;

    this.activeSnapshot = {
      contextVersion: this.contextVersion,
      location: { latitude, longitude },
      speed,
      road: 'Highway-101',
      route: null,
      legalContext: null,
      riskContext: null,
      navigationContext: null,
      driverContext: null,
      datasetVersions: { maps: '1.0.0', legal: '1.0.0' },
    };

    this.eventBus.publish('CONTEXT_UPDATED', 'context-coordinator', 'corr_gps_update', 'NORMAL', this.activeSnapshot);
  }

  acceptEvaluationResult(resultVersion: number, resultData: any): boolean {
    if (resultVersion < this.latestAcceptedContextVersion) {
      console.warn(`[DriveLegalRuntime] Rejected stale evaluation result. Stale: V${resultVersion}, Current accepted: V${this.latestAcceptedContextVersion}`);
      return false;
    }

    this.latestAcceptedContextVersion = resultVersion;
    return true;
  }

  getSystemHealth(): SystemHealth {
    return {
      runtime: this.runtimeState,
      engines: this.registry.getAllEngineHealth(),
      datasets: 'CURRENT',
      security: 'SECURE',
      storage: 'HEALTHY',
      network: 'OFFLINE',
      overallState: 'SECURE',
    };
  }

  getEventBus(): EventBus {
    return this.eventBus;
  }

  getAlertManager(): AlertManager {
    return this.alertManager;
  }

  getRecoveryManager(): RecoveryManager {
    return this.recoveryManager;
  }

  reset(): void {
    this.runtimeState = 'STOPPED';
    this.eventBus.reset();
    this.registry.reset();
    this.alertManager.reset();
    this.recoveryManager.clearJournal();
    this.contextVersion = 0;
    this.latestAcceptedContextVersion = 0;
    this.activeSnapshot = null;
    this.registerEngines();
  }
}
export default DriveLegalRuntime;
