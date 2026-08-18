import { RuntimeState, RuntimeStatus, RuntimeMode, BaseEvent, TripRuntimeState } from './types';
import { EventBus } from './EventBus';
import { HealthMonitor } from './HealthMonitor';
import { MemoryManager } from '../memory/MemoryManager';
import { DriverContextEngine } from '../driver-context/DriverContextEngine';
import { Orchestrator } from '../agents/orchestrator/Orchestrator';

export class DriveLegalRuntime {
  protected status: RuntimeStatus = 'CREATED';
  protected mode: RuntimeMode = 'ONLINE';
  protected eventBus: EventBus;
  protected healthMonitor: HealthMonitor;
  protected memory: MemoryManager;
  protected contextEngine: DriverContextEngine;
  protected orchestrator: Orchestrator;
  
  protected activeTrip?: TripRuntimeState;
  protected activeRoute?: any;
  protected activeAlerts: any[] = [];
  protected startedAt = 0;

  constructor() {
    this.eventBus = new EventBus();
    this.healthMonitor = new HealthMonitor();
    this.memory = new MemoryManager('driver_default');
    this.contextEngine = new DriverContextEngine();
    this.orchestrator = new Orchestrator('HYBRID');
  }

  async initialize(): Promise<void> {
    this.status = 'INITIALIZING';
    this.startedAt = Date.now();
    console.log('[Runtime] Startup sequence initiated.');

    try {
      const runtimeHealth = this.healthMonitor.evaluateRuntimeStatus();
      if (runtimeHealth === 'FAILED') {
        this.status = 'FAILED';
        throw new Error('Runtime Startup Aborted: Critical dependencies unavailable.');
      }

      this.setupSubscriptions();

      this.status = 'READY';
      console.log('[Runtime] Startup sequence completed. Ready.');
    } catch (e) {
      this.status = 'FAILED';
      console.error('[Runtime] Initialization error:', e);
      throw e;
    }
  }

  protected setupSubscriptions(): void {
    this.eventBus.subscribe('SPEED_UPDATED', (event) => {
      const speed = event.payload.speed;
      this.contextEngine.updateTelemetry(speed, 1.0);
      if (this.activeTrip) {
        this.activeTrip.score = Math.max(0, 100 - Math.floor(speed / 2));
      }
    });

    this.eventBus.subscribe('LOCATION_UPDATED', (event) => {
      const { latitude, longitude, speed } = event.payload;
      if (this.activeTrip) {
        this.activeTrip.currentLocation = { latitude, longitude };
      }
      this.contextEngine.updateTelemetry(speed || 0, 1.0);
    });

    this.eventBus.subscribe('CAMERA_OBSERVATION', (event) => {
      const { type, confidence } = event.payload;
      if (type === 'HAZARD' && confidence > 0.8) {
        this.eventBus.publish({
          id: `ev_haz_${Date.now()}`,
          type: 'HAZARD_DETECTED',
          timestamp: Date.now(),
          source: 'runtime',
          correlationId: event.correlationId,
          tripId: event.tripId,
          payload: event.payload,
          schemaVersion: '1.0',
        });
      }
    });

    this.eventBus.subscribe('HAZARD_DETECTED', (event) => {
      const alert = {
        id: `alert_${Date.now()}`,
        type: 'HAZARD_WARNING',
        severity: 'CRITICAL',
        message: `Warning: ${event.payload.description || 'Road Hazard'} detected!`,
        timestamp: Date.now(),
      };
      this.activeAlerts.push(alert);
      this.eventBus.publish({
        id: `ev_alert_${Date.now()}`,
        type: 'ALERT_CREATED',
        timestamp: Date.now(),
        source: 'runtime',
        correlationId: event.correlationId,
        tripId: event.tripId,
        payload: alert,
        schemaVersion: '1.0',
      });
    });
  }

  start(): void {
    if (this.status !== 'READY') {
      throw new Error(`Cannot start runtime in status: ${this.status}`);
    }
    this.status = 'RUNNING';
    console.log('[Runtime] Main execution loop started.');
  }

  getState(): RuntimeState {
    return {
      status: this.status,
      startedAt: this.startedAt,
      currentTrip: this.activeTrip,
      currentContext: this.contextEngine.buildContext(),
      activeAlerts: this.activeAlerts,
      activeRoute: this.activeRoute,
      subsystemHealth: this.healthMonitor.getAllHealth(),
      mode: this.mode,
    };
  }

  async startTrip(tripId: string, destination: string): Promise<void> {
    this.activeTrip = {
      tripId,
      startedAt: Date.now(),
      distance: 0,
      duration: 0,
      risk: 0,
      score: 100,
      alerts: [],
      events: [],
    };

    this.memory.startTrip({
      tripId,
      startTime: Date.now(),
      tripScore: 100,
      distanceTraveledMeters: 0,
      durationSeconds: 0,
      startLocation: { latitude: 11.0168, longitude: 76.9558 },
    });

    await this.eventBus.publish({
      id: `ev_trip_start_${Date.now()}`,
      type: 'TRIP_STARTED',
      timestamp: Date.now(),
      source: 'runtime',
      correlationId: `corr_${Date.now()}`,
      tripId,
      payload: { destination },
      schemaVersion: '1.0',
    });
  }

  async endTrip(): Promise<void> {
    if (!this.activeTrip) return;

    const tripId = this.activeTrip.tripId;

    this.memory.endTrip();

    await this.eventBus.publish({
      id: `ev_trip_end_${Date.now()}`,
      type: 'TRIP_COMPLETED',
      timestamp: Date.now(),
      source: 'runtime',
      correlationId: `corr_${Date.now()}`,
      tripId,
      payload: { score: this.activeTrip.score },
      schemaVersion: '1.0',
    });

    this.activeTrip = undefined;
    this.activeAlerts = [];
  }

  async processVoiceCommand(command: string): Promise<any> {
    const context = {
      realTime: {
        speed: this.getState().currentContext?.vehicleContext?.currentSpeed ?? 0,
        heading: 0,
        latitude: 11.0168,
        longitude: 76.9558,
        vehicleType: 'car' as const,
      },
      trip: {
        routeId: this.activeTrip?.tripId,
        destinationName: 'Coimbatore Airport',
        tripScore: this.activeTrip?.score ?? 100,
      },
      system: {
        country: 'IN',
        state: 'TN',
        city: 'Coimbatore',
      },
      preferences: {
        voiceEnabled: true,
        alertFrequency: 'medium' as const,
        navigationAlerts: true,
        legalAlerts: true,
        safetyAlerts: true,
      },
    };

    return await this.orchestrator.process(command, context);
  }

  transitionToOffline(): void {
    this.mode = 'OFFLINE';
    this.orchestrator.setFallbackMode('DETERMINISTIC');
  }

  transitionToOnline(): void {
    this.mode = 'ONLINE';
    this.orchestrator.setFallbackMode('HYBRID');
  }

  async shutdown(): Promise<void> {
    this.status = 'STOPPING';
    console.log('[Runtime] Initiating graceful shutdown.');

    this.eventBus.clear();
    this.activeTrip = undefined;
    this.activeAlerts = [];

    this.status = 'STOPPED';
    console.log('[Runtime] Graceful shutdown completed.');
  }

  getEventBus(): EventBus {
    return this.eventBus;
  }

  getHealthMonitor(): HealthMonitor {
    return this.healthMonitor;
  }
}
export default DriveLegalRuntime;
