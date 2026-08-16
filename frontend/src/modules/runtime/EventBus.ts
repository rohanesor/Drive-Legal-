import { BaseEvent } from './types';

export type EventCallback = (event: BaseEvent) => void | Promise<void>;

export class EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private processedIds: Set<string> = new Set();
  private maxDeduplicationCacheSize = 500;
  private recentIds: string[] = [];

  private debounceTimers: Map<string, any> = new Map();
  private pendingPayloads: Map<string, BaseEvent> = new Map();

  subscribe(type: string, callback: EventCallback): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);
    return () => {
      const set = this.listeners.get(type);
      if (set) {
        set.delete(callback);
      }
    };
  }

  async publish(event: BaseEvent, bypassBackpressure = false): Promise<void> {
    if (!event.id || !event.type || !event.timestamp || !event.source || event.correlationId === undefined) {
      throw new Error(`Malformed Event rejected: ${JSON.stringify(event)}`);
    }

    if (this.processedIds.has(event.id)) {
      console.log(`[EventBus] Duplicate event rejected: ${event.id}`);
      return;
    }
    this.processedIds.add(event.id);
    this.recentIds.push(event.id);
    if (this.recentIds.length > this.maxDeduplicationCacheSize) {
      const oldest = this.recentIds.shift();
      if (oldest) this.processedIds.delete(oldest);
    }

    const highFrequencyTypes = ['LOCATION_UPDATED', 'SPEED_UPDATED', 'VEHICLE_UPDATED'];
    if (highFrequencyTypes.includes(event.type) && !bypassBackpressure) {
      this.pendingPayloads.set(event.type, event);
      if (this.debounceTimers.has(event.type)) {
        return;
      }
      const timer = setTimeout(() => {
        const coalesced = this.pendingPayloads.get(event.type);
        this.debounceTimers.delete(event.type);
        this.pendingPayloads.delete(event.type);
        if (coalesced) {
          this.dispatch(coalesced);
        }
      }, 50);
      this.debounceTimers.set(event.type, timer);
      return;
    }

    await this.dispatch(event);
  }

  private async dispatch(event: BaseEvent): Promise<void> {
    const callbacks = this.listeners.get(event.type);
    if (callbacks) {
      for (const cb of callbacks) {
        try {
          await cb(event);
        } catch (e) {
          console.error(`[EventBus] Subscriber failed for event ${event.type}:`, e);
        }
      }
    }
  }

  clear(): void {
    this.listeners.clear();
    this.processedIds.clear();
    this.recentIds = [];
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    this.pendingPayloads.clear();
  }
}
export default EventBus;
