import { EventEnvelope } from './types';

export type EventCallback = (event: EventEnvelope) => void;

export class EventBus {
  private subscribers: Map<string, Set<EventCallback>> = new Map();
  private sequenceCounter = 0;

  subscribe(eventType: string, callback: EventCallback): void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType)!.add(callback);
  }

  unsubscribe(eventType: string, callback: EventCallback): void {
    const subs = this.subscribers.get(eventType);
    if (subs) {
      subs.delete(callback);
    }
  }

  publish(
    eventType: string,
    source: string,
    correlationId: string,
    priority: EventEnvelope['priority'],
    payload: any
  ): void {
    this.sequenceCounter++;
    const envelope: EventEnvelope = {
      eventId: `evt_${Date.now()}_${this.sequenceCounter}`,
      eventType,
      timestamp: Date.now(),
      sequenceNumber: this.sequenceCounter,
      source,
      correlationId,
      priority,
      payload,
    };

    const subs = this.subscribers.get(eventType);
    if (subs) {
      subs.forEach((cb) => {
        try {
          cb(envelope);
        } catch (err) {
          console.error(`[EventBus] Callback error on event ${eventType}:`, err);
        }
      });
    }
  }

  reset(): void {
    this.subscribers.clear();
    this.sequenceCounter = 0;
  }
}
export default EventBus;
