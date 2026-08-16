import { ContextStore } from './ContextStore';
import { MemoryRetriever } from './MemoryRetriever';
import { MemoryWriter } from './MemoryWriter';
import { DriveMemory, ShortTermContext, TripMemory, LongTermDriverMemory } from './types';

export class MemoryManager {
  private store: ContextStore;
  private retriever: MemoryRetriever;
  private writer: MemoryWriter;

  constructor(driverId: string = 'driver_default') {
    this.store = new ContextStore(driverId);
    this.retriever = new MemoryRetriever(this.store);
    this.writer = new MemoryWriter(this.store);
  }

  getStore(): ContextStore {
    return this.store;
  }

  getRetriever(): MemoryRetriever {
    return this.retriever;
  }

  getWriter(): MemoryWriter {
    return this.writer;
  }

  getMemory(): DriveMemory {
    return this.store.getMemory();
  }

  updateShortTerm(context: Partial<ShortTermContext>): void {
    this.store.updateShortTerm(context);
  }

  startTrip(trip: Omit<TripMemory, 'loggedIncidentsCount'>): void {
    this.store.startTrip(trip);
  }

  incrementTripIncident(eventType: string): void {
    this.store.incrementTripIncident(eventType);
  }

  addConversationTurn(role: 'user' | 'assistant' | 'system', content: string): void {
    this.writer.logConversationTurn(role, content);
  }

  updateLongTerm(data: Partial<LongTermDriverMemory>): void {
    this.store.updateLongTerm(data);
  }

  endTrip(): void {
    this.writer.logTripEnd();
  }
}
export default MemoryManager;
