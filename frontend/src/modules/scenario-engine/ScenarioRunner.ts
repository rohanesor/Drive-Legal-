import { 
  ScenarioDefinition, ScenarioContext, ScenarioReport 
} from './types';
import { DriveLegalStateCoordinator } from '../state-machine/DriveLegalStateCoordinator';
import { EventBus } from '../runtime/EventBus';
import { DriveLegalEvent } from '../event-contract/types';
import { FaultInjector } from './FaultInjector';
import { ScenarioAssertionEngine } from './ScenarioAssertionEngine';

export class ScenarioRunner {
  private coordinator: DriveLegalStateCoordinator;
  private eventBus: EventBus;
  private faultInjector = new FaultInjector();
  private observedEvents: DriveLegalEvent[] = [];

  constructor(coordinator: DriveLegalStateCoordinator, eventBus: EventBus) {
    this.coordinator = coordinator;
    this.eventBus = eventBus;
  }

  async run(
    scenario: ScenarioDefinition,
    virtualClockMode: 'FAST' | 'REALTIME' = 'FAST'
  ): Promise<ScenarioReport> {
    const startedAt = Date.now();
    const runId = `run_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    this.observedEvents = [];

    this.coordinator.resetRuntimeState('SYSTEM');
    const unsub = this.eventBus.subscribe('*', (event) => {
      this.observedEvents.push(event as any);
    });

    const context: ScenarioContext = {
      scenarioId: scenario.id,
      scenarioVersion: scenario.version,
      runId,
      virtualTime: 0,
      seed: scenario.seed || 42,
      currentStepIndex: 0,
      variables: scenario.variables || {},
      observedEvents: [],
    };

    let assertionsPassed = 0;
    let assertionsFailed = 0;
    const errors: string[] = [];

    if (scenario.initialState.trip) {
      this.coordinator.getTripSM().transition(scenario.initialState.trip as any);
    }
    if (scenario.initialState.motion) {
      if (scenario.initialState.motion === 'MOVING') {
        this.coordinator.getMotionSM().updateSpeed(10);
      }
    }

    for (let i = 0; i < scenario.steps.length; i++) {
      const step = scenario.steps[i];
      context.currentStepIndex = i;
      context.virtualTime = step.at;

      if (virtualClockMode === 'REALTIME' && i > 0) {
        const prev = scenario.steps[i - 1];
        const diffSeconds = step.at - prev.at;
        if (diffSeconds > 0) {
          await new Promise((resolve) => setTimeout(resolve, diffSeconds * 10));
        }
      }

      const payload = this.substituteVariables(step.payload, context.variables);

      const canonicalEvent: DriveLegalEvent = {
        id: `evt_${runId}_step_${i}`,
        type: step.event,
        timestamp: Date.now(),
        eventId: `evt_${runId}_step_${i}`,
        eventType: step.event,
        eventVersion: 'v1',
        schemaVersion: '1.0',
        occurredAt: Date.now(),
        publishedAt: Date.now(),
        sequence: i + 1,
        source: 'scenario-runner',
        sourceVersion: '1.0.0',
        correlationId: runId,
        tripId: 'scenario_trip',
        payload,
        metadata: {},
        provenance: {
          source: 'scenario-runner',
          method: 'simulated',
          capturedAt: Date.now(),
          derivedFrom: [],
        },
        confidence: {
          score: 1.0,
          level: 'HIGH',
          factors: [],
          confidenceSource: 'sensor',
        },
        trustLevel: 'TRUSTED',
      };

      const eventsToPublish = this.faultInjector.injectFaults(canonicalEvent, context.virtualTime);

      for (const ev of eventsToPublish) {
        await this.eventBus.publish(ev);
      }

      if (step.assertions) {
        const stateSnapshot = this.coordinator.getCurrentSnapshot();
        const stateAssertions = step.assertions.filter((a) => a.type === 'state');
        for (const sa of stateAssertions) {
          const { passed } = ScenarioAssertionEngine.evaluateStateAssertion(sa, stateSnapshot);
          if (passed) assertionsPassed++;
          else {
            assertionsFailed++;
            errors.push(`Assertion failed on step ${step.id}: expected ${sa.target}=${sa.expected}`);
          }
        }

        const eventAssertions = step.assertions.filter((a) => a.type !== 'state');
        const { passedCount, failedAssertions } = ScenarioAssertionEngine.evaluateEventAssertions(
          eventAssertions,
          this.observedEvents
        );
        assertionsPassed += passedCount;
        assertionsFailed += failedAssertions.length;
        for (const fa of failedAssertions) {
          errors.push(`Assertion failed on step ${step.id}: ${fa.assertion.type} expectation failed.`);
        }
      }
    }

    unsub();

    const completedAt = Date.now();
    const finalState = this.coordinator.getCurrentSnapshot();

    return {
      scenarioId: scenario.id,
      runId,
      status: assertionsFailed === 0 ? 'COMPLETED' : 'FAILED',
      startedAt,
      completedAt,
      duration: completedAt - startedAt,
      stepsExecuted: scenario.steps.length,
      eventsGenerated: scenario.steps.length,
      eventsObserved: this.observedEvents.length,
      assertionsPassed,
      assertionsFailed,
      faultsInjected: [],
      finalState,
      errors,
      performance: {
        durationMs: completedAt - startedAt,
      },
    };
  }

  private substituteVariables(payload: any, variables: Record<string, any>): any {
    if (!payload) return payload;
    const jsonStr = JSON.stringify(payload);
    let resultStr = jsonStr;
    for (const [key, val] of Object.entries(variables)) {
      resultStr = resultStr.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), String(val));
    }
    return JSON.parse(resultStr);
  }

  getFaultInjector(): FaultInjector {
    return this.faultInjector;
  }
}
export default ScenarioRunner;
