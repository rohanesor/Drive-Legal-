export interface DemoTelemetry {
  stepName: string;
  engineState: string;
  offlineStatus: boolean;
  activeAlerts: string[];
}

export class DemoEnvironment {
  private stepIndex = 0;
  private isOfflineMode = false;
  private telemetryHistory: DemoTelemetry[] = [];

  reset(): void {
    this.stepIndex = 0;
    this.isOfflineMode = false;
    this.telemetryHistory = [];
    console.log('[DemoEnvironment] Demo state reset to initial values.');
  }

  nextStep(): DemoTelemetry {
    this.stepIndex++;

    let telemetry: DemoTelemetry;

    switch (this.stepIndex) {
      case 1:
        telemetry = {
          stepName: 'START',
          engineState: 'INITIALIZING',
          offlineStatus: false,
          activeAlerts: [],
        };
        break;
      case 2:
        telemetry = {
          stepName: 'GPS_ACQUIRED',
          engineState: 'DRIVING',
          offlineStatus: false,
          activeAlerts: [],
        };
        break;
      case 3:
        telemetry = {
          stepName: 'SPEED_LIMIT_EXCEEDED',
          engineState: 'DRIVING',
          offlineStatus: false,
          activeAlerts: ['SPEED_LIMIT_WARNING'],
        };
        break;
      case 4:
        this.isOfflineMode = true;
        telemetry = {
          stepName: 'OFFLINE_DRIVING',
          engineState: 'DRIVING',
          offlineStatus: true,
          activeAlerts: [],
        };
        break;
      default:
        telemetry = {
          stepName: 'GPS_INTERRUPTED',
          engineState: 'DEGRADED',
          offlineStatus: true,
          activeAlerts: ['POSITION_STALE_ALERT'],
        };
        break;
    }

    this.telemetryHistory.push(telemetry);
    return telemetry;
  }

  getTelemetryHistory(): DemoTelemetry[] {
    return this.telemetryHistory;
  }
}
export default DemoEnvironment;
