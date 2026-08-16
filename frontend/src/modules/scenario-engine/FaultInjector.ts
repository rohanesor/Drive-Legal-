import { FaultDefinition } from './types';
import { DriveLegalEvent } from '../event-contract/types';

export class FaultInjector {
  private activeFaults: FaultDefinition[] = [];

  setFaults(faults: FaultDefinition[]): void {
    this.activeFaults = faults;
  }

  isFaultActive(type: FaultDefinition['type'], virtualTime: number): boolean {
    return this.activeFaults.some(
      (f) => f.type === type && virtualTime >= f.startAt && virtualTime < f.startAt + f.duration
    );
  }

  injectFaults(event: DriveLegalEvent, virtualTime: number): DriveLegalEvent[] {
    const output: DriveLegalEvent[] = [];

    if (event.eventType === 'location.updated' && this.isFaultActive('GPS_FAILURE', virtualTime)) {
      console.warn(`[FaultInjector] Injected GPS_FAILURE. Dropping location update: ${event.eventId}`);
      return [];
    }

    if (this.isFaultActive('NETWORK_FAILURE', virtualTime)) {
      console.warn(`[FaultInjector] Injected NETWORK_FAILURE. Modifying connectivity.`);
      event.metadata.sourceType = 'offline';
    }

    if (this.isFaultActive('EVENT_DUPLICATION', virtualTime)) {
      console.warn(`[FaultInjector] Injected EVENT_DUPLICATION. Duplicating event: ${event.eventId}`);
      output.push(event);
      output.push({ ...event, id: `${event.id}_dup`, eventId: `${event.eventId}_dup` });
      return output;
    }

    if (this.isFaultActive('STALE_EVENT', virtualTime)) {
      console.warn(`[FaultInjector] Injected STALE_EVENT. Modifying occurredAt to 10 seconds ago.`);
      event.occurredAt = event.occurredAt - 10000;
      event.timestamp = event.timestamp - 10000;
    }

    if (this.isFaultActive('EVENT_DELAY', virtualTime)) {
      console.warn(`[FaultInjector] Injected EVENT_DELAY. Delaying event.`);
      event.metadata.environment = 'DELAYED';
    }

    output.push(event);
    return output;
  }
}
export default FaultInjector;
