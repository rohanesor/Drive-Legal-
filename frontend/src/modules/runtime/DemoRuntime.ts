import { DriveLegalRuntime } from './DriveLegalRuntime';

export class DemoRuntime extends DriveLegalRuntime {
  constructor() {
    super();
    this.mode = 'DEMO';
  }

  async simulateSpeed(speed: number): Promise<void> {
    await this.eventBus.publish({
      id: `ev_sim_speed_${Date.now()}_${Math.random()}`,
      type: 'SPEED_UPDATED',
      timestamp: Date.now(),
      source: 'simulator',
      correlationId: `corr_sim_${Date.now()}`,
      tripId: this.activeTrip?.tripId || 'demo_trip',
      payload: { speed },
      schemaVersion: '1.0',
    });
  }

  async simulateCameraObservation(hazardType: string, description: string): Promise<void> {
    await this.eventBus.publish({
      id: `ev_sim_cam_${Date.now()}_${Math.random()}`,
      type: 'CAMERA_OBSERVATION',
      timestamp: Date.now(),
      source: 'simulator',
      correlationId: `corr_sim_${Date.now()}`,
      tripId: this.activeTrip?.tripId || 'demo_trip',
      payload: { type: 'HAZARD', value: hazardType, description, confidence: 0.95 },
      schemaVersion: '1.0',
    });
  }
}
export default DemoRuntime;
