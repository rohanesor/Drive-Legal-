import { VehicleConnectionState, VehicleTelemetry } from './types';
import { VehicleApiAdapter } from './adapters/VehicleApiAdapter';
import { OBDAdapter } from './adapters/OBDAdapter';
import { MobileAdapter } from './adapters/MobileAdapter';

export class VehicleConnectionManager {
  private activeState: VehicleConnectionState = 'DISCONNECTED';
  private providers: {
    API: VehicleApiAdapter;
    OBD: OBDAdapter;
    MOBILE: MobileAdapter;
  };
  private activeSource: 'API' | 'OBD' | 'MOBILE' = 'MOBILE';
  private callback?: (data: VehicleTelemetry) => void;

  private listeners: Record<string, ((event: any) => void)[]> = {
    vehicle_connected: [],
    vehicle_disconnected: [],
    vehicle_connection_degraded: [],
    telemetry_received: [],
  };

  constructor() {
    this.providers = {
      API: new VehicleApiAdapter(),
      OBD: new OBDAdapter(),
      MOBILE: new MobileAdapter(),
    };

    this.providers.API.subscribe((data) => this.handleTelemetry(data, 'API'));
    this.providers.OBD.subscribe((data) => this.handleTelemetry(data, 'OBD'));
    this.providers.MOBILE.subscribe((data) => this.handleTelemetry(data, 'MOBILE'));
  }

  getAPIAdapter(): VehicleApiAdapter { return this.providers.API; }
  getOBDAdapter(): OBDAdapter { return this.providers.OBD; }
  getMobileAdapter(): MobileAdapter { return this.providers.MOBILE; }
  getStatus(): VehicleConnectionState { return this.activeState; }
  getActiveSource(): 'API' | 'OBD' | 'MOBILE' { return this.activeSource; }

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

  async connectSource(source: 'API' | 'OBD' | 'MOBILE'): Promise<void> {
    this.activeState = 'CONNECTING';
    try {
      await this.providers[source].connect();
      this.activeState = 'CONNECTED';
      this.activeSource = source;
      this.publishEvent('vehicle_connected', { source });
    } catch (e) {
      this.activeState = 'ERROR';
      this.publishEvent('vehicle_connection_degraded', { error: 'Connection failed' });
    }
  }

  async disconnectActive(): Promise<void> {
    const prev = this.activeSource;
    await this.providers[prev].disconnect();
    
    if (prev === 'API') {
      this.activeSource = 'OBD';
      this.activeState = 'DEGRADED';
      this.publishEvent('vehicle_connection_degraded', { from: 'API', to: 'OBD' });
    } else if (prev === 'OBD') {
      this.activeSource = 'MOBILE';
      this.activeState = 'DEGRADED';
      this.publishEvent('vehicle_connection_degraded', { from: 'OBD', to: 'MOBILE' });
    } else {
      this.activeSource = 'MOBILE';
      this.activeState = 'DISCONNECTED';
      this.publishEvent('vehicle_disconnected', {});
    }
  }

  subscribeTelemetry(callback: (data: VehicleTelemetry) => void): void {
    this.callback = callback;
  }

  private handleTelemetry(data: VehicleTelemetry, origin: 'API' | 'OBD' | 'MOBILE'): void {
    if (origin === this.activeSource && this.callback) {
      this.callback(data);
      this.publishEvent('telemetry_received', data);
    }
  }
}
export default VehicleConnectionManager;
