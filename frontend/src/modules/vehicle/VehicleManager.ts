import { 
  VehicleTelemetry, VehicleCapabilities, 
  DriverDisplayState, TelemetryConflict, ChargingContext 
} from './types';
import { VehicleConnectionManager } from './VehicleConnectionManager';
import { TelemetryNormalizer } from './TelemetryNormalizer';
import { EVAdapter } from './adapters/EVAdapter';
import { AndroidAutoAdapter } from './adapters/AndroidAutoAdapter';
import { CarPlayAdapter } from './adapters/CarPlayAdapter';

export class VehicleManager {
  private connManager: VehicleConnectionManager;
  private evAdapter: EVAdapter;
  private androidAuto: AndroidAutoAdapter;
  private carPlay: CarPlayAdapter;

  private latestTelemetry?: VehicleTelemetry;
  private currentDisplayState?: DriverDisplayState;

  private listeners: Record<string, ((event: any) => void)[]> = {
    telemetry_conflict: [],
    vehicle_connected: [],
    vehicle_disconnected: [],
    vehicle_connection_degraded: [],
  };

  constructor() {
    this.connManager = new VehicleConnectionManager();
    this.evAdapter = new EVAdapter();
    this.androidAuto = new AndroidAutoAdapter();
    this.carPlay = new CarPlayAdapter();

    this.connManager.subscribeTelemetry((data) => this.processIncomingTelemetry(data));
    this.connManager.subscribeEvent('vehicle_connected', (evt) => this.publishEvent('vehicle_connected', evt));
    this.connManager.subscribeEvent('vehicle_disconnected', (evt) => this.publishEvent('vehicle_disconnected', evt));
    this.connManager.subscribeEvent('vehicle_connection_degraded', (evt) => this.publishEvent('vehicle_connection_degraded', evt));
  }

  getConnectionManager(): VehicleConnectionManager { return this.connManager; }
  getAndroidAuto(): AndroidAutoAdapter { return this.androidAuto; }
  getCarPlay(): CarPlayAdapter { return this.carPlay; }
  getLatestTelemetry(): VehicleTelemetry | undefined { return this.latestTelemetry; }

  subscribeEvent(event: string, callback: (event: any) => void): void {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  private publishEvent(event: string, data: any): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach((cb) => cb(data));
    }
  }

  private processIncomingTelemetry(data: VehicleTelemetry): void {
    const normalized = TelemetryNormalizer.normalize(data);

    if (
      this.latestTelemetry &&
      normalized.speed !== undefined &&
      this.latestTelemetry.speed !== undefined
    ) {
      const diff = Math.abs(normalized.speed - this.latestTelemetry.speed);
      if (diff > 15 && normalized.source !== this.latestTelemetry.source) {
        const conflict: TelemetryConflict = {
          signal: 'speed',
          values: [normalized.speed, this.latestTelemetry.speed],
          sources: [normalized.source, this.latestTelemetry.source],
          severity: 'HIGH',
          resolution: 'Use conservative lower speed limit checks for compliance evaluation.',
        };
        this.publishEvent('telemetry_conflict', conflict);
      }
    }

    this.latestTelemetry = normalized;
  }

  getCapabilities(): VehicleCapabilities {
    const source = this.connManager.getActiveSource();
    if (source === 'API') return this.connManager.getAPIAdapter().getCapabilities();
    if (source === 'OBD') return this.connManager.getOBDAdapter().getCapabilities();
    return this.connManager.getMobileAdapter().getCapabilities();
  }

  getChargingContext(destinationDistanceKm?: number): ChargingContext | null {
    if (!this.latestTelemetry) return null;
    return this.evAdapter.buildChargingContext(this.latestTelemetry, destinationDistanceKm);
  }

  updateDisplay(state: DriverDisplayState): void {
    this.currentDisplayState = state;
    this.androidAuto.updateDisplay(state);
    this.carPlay.updateDisplay(state);
  }

  getCurrentDisplayState(): DriverDisplayState | undefined {
    return this.currentDisplayState;
  }
}
export default VehicleManager;
