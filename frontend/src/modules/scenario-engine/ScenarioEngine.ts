import { ScenarioDefinition } from './types';

export class ScenarioEngine {
  private scenarios: Map<string, ScenarioDefinition> = new Map();

  constructor() {
    this.registerDemoScenarios();
  }

  registerScenario(scenario: ScenarioDefinition): void {
    this.scenarios.set(scenario.id, scenario);
  }

  getScenario(id: string): ScenarioDefinition | undefined {
    return this.scenarios.get(id);
  }

  listScenarios(): ScenarioDefinition[] {
    return Array.from(this.scenarios.values());
  }

  validateScenario(scenario: ScenarioDefinition): boolean {
    if (!scenario.id || !scenario.name || !scenario.steps || scenario.steps.length === 0) {
      return false;
    }
    return true;
  }

  private registerDemoScenarios(): void {
    this.registerScenario({
      id: 'safe-urban-drive',
      name: 'Safe Urban Drive',
      version: '1.0',
      metadata: { category: 'safety', description: 'Driver cruises within speed limit safely.' },
      initialState: { trip: 'IDLE', motion: 'PARKED' },
      steps: [
        {
          id: 'start-trip',
          at: 0,
          event: 'trip.started',
          payload: { destination: 'Office' },
          assertions: [{ id: 'a1', type: 'state', target: 'trip', expected: 'PREPARING' }],
        },
        {
          id: 'cruise',
          at: 5,
          event: 'speed.updated',
          payload: { speed: 30 },
          assertions: [{ id: 'a2', type: 'state', target: 'motion', expected: 'MOVING' }],
        },
      ],
    });

    this.registerScenario({
      id: 'speeding-alert',
      name: 'Speeding Alert',
      version: '1.0',
      metadata: { category: 'safety', description: 'Driver exceeds posted speed limit, triggers alert.' },
      initialState: { trip: 'ACTIVE', motion: 'MOVING' },
      steps: [
        {
          id: 'exceed-speed',
          at: 5,
          event: 'speed.updated',
          payload: { speed: 72 },
        },
      ],
    });
  }
}
export default ScenarioEngine;
