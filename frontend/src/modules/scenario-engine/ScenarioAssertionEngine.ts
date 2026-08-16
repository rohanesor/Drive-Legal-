import { ScenarioAssertion } from './types';
import { DriveLegalStateSnapshot } from '../state-machine/types';
import { DriveLegalEvent } from '../event-contract/types';

export class ScenarioAssertionEngine {
  static evaluateStateAssertion(
    assertion: ScenarioAssertion,
    state: DriveLegalStateSnapshot
  ): { passed: boolean; actual: any } {
    const field = assertion.target as keyof DriveLegalStateSnapshot;
    const actual = state[field];
    const passed = actual === assertion.expected;
    return { passed, actual };
  }

  static evaluateEventAssertions(
    assertions: ScenarioAssertion[],
    observedEvents: DriveLegalEvent[]
  ): { passedCount: number; failedAssertions: { assertion: ScenarioAssertion; actual: any }[] } {
    let passedCount = 0;
    const failedAssertions: { assertion: ScenarioAssertion; actual: any }[] = [];

    for (const assertion of assertions) {
      if (assertion.type === 'event') {
        const found = observedEvents.some((e) => e.eventType === assertion.target);
        if (found) {
          passedCount++;
        } else {
          failedAssertions.push({ assertion, actual: 'Event not emitted' });
        }
      } else if (assertion.type === 'absence') {
        const found = observedEvents.some((e) => e.eventType === assertion.target);
        if (!found) {
          passedCount++;
        } else {
          failedAssertions.push({ assertion, actual: 'Event emitted unexpectedly' });
        }
      } else if (assertion.type === 'count') {
        const count = observedEvents.filter((e) => e.eventType === assertion.target).length;
        if (count === assertion.expected) {
          passedCount++;
        } else {
          failedAssertions.push({ assertion, actual: `Observed count: ${count}` });
        }
      } else if (assertion.type === 'timing') {
        const hazardEvent = observedEvents.find((e) => e.eventType === 'hazard.detected');
        const alertEvent = observedEvents.find((e) => e.eventType === 'alert.created');
        if (hazardEvent && alertEvent) {
          const latency = alertEvent.occurredAt - hazardEvent.occurredAt;
          if (assertion.timeoutMs !== undefined && latency <= assertion.timeoutMs) {
            passedCount++;
          } else {
            failedAssertions.push({ assertion, actual: `Latency: ${latency}ms` });
          }
        } else {
          failedAssertions.push({ assertion, actual: 'Missing events to evaluate timing' });
        }
      }
    }

    return { passedCount, failedAssertions };
  }
}
export default ScenarioAssertionEngine;
