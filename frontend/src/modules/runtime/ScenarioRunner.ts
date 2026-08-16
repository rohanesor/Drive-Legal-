import { DemoRuntime } from './DemoRuntime';

export class ScenarioRunner {
  static async runUrbanSpeeding(runtime: DemoRuntime): Promise<{ alertCount: number; lastAlert?: any }> {
    await runtime.getEventBus().publish({
      id: `ev_limit_${Date.now()}_${Math.random()}`,
      type: 'SPEED_LIMIT_CHANGED',
      timestamp: Date.now(),
      source: 'simulator',
      correlationId: 'corr_1',
      tripId: 'trip_speeding',
      payload: { speedLimit: 50 },
      schemaVersion: '1.0',
    }, true);

    await runtime.simulateSpeed(72);
    await new Promise((resolve) => setTimeout(resolve, 60));

    const state = runtime.getState();
    return {
      alertCount: state.activeAlerts.length,
      lastAlert: state.activeAlerts[state.activeAlerts.length - 1],
    };
  }

  static async runUnexpectedHazard(runtime: DemoRuntime): Promise<{ alertCreated: boolean }> {
    await runtime.simulateCameraObservation('OBSTACLE', 'Large potholes blocking road lanes');
    await new Promise((resolve) => setTimeout(resolve, 60));

    const state = runtime.getState();
    const hasHazardWarning = state.activeAlerts.some((a) => a.type === 'HAZARD_WARNING');
    return {
      alertCreated: hasHazardWarning,
    };
  }
}
export default ScenarioRunner;
