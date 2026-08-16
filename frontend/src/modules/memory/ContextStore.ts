import { ShortTermContext, TripMemory, ConversationMemory, LongTermDriverMemory, DriveMemory } from './types';
import { MemoryPolicy } from './MemoryPolicy';

export class ContextStore {
  private memory: DriveMemory;

  constructor(driverId: string = 'driver_default') {
    this.memory = {
      shortTerm: {
        activeSpeedingPersistenceSeconds: 0,
        recentSwervingDetected: false,
        lastBrakingIntensity: 0,
      },
      currentTrip: undefined,
      conversation: {
        sessionId: 'session_default',
        turns: [],
      },
      longTerm: {
        driverId,
        averageDriveScore: 90,
        tripsCount: 0,
        frequentlyVisitedCities: [],
        learnedPatterns: [],
        preferences: {
          voiceEnabled: true,
          alertFrequency: 'medium',
          navigationAlerts: true,
          legalAlerts: true,
          safetyAlerts: true,
        },
      },
    };
  }

  getMemory(): DriveMemory {
    return this.memory;
  }

  updateShortTerm(context: Partial<ShortTermContext>): void {
    this.memory.shortTerm = {
      ...this.memory.shortTerm,
      ...context,
    };
  }

  startTrip(trip: Omit<TripMemory, 'loggedIncidentsCount'>): void {
    this.memory.currentTrip = {
      ...trip,
      loggedIncidentsCount: {},
    };
  }

  incrementTripIncident(eventType: string): void {
    if (this.memory.currentTrip) {
      const counts = this.memory.currentTrip.loggedIncidentsCount;
      counts[eventType] = (counts[eventType] || 0) + 1;
    }
  }

  addConversationTurn(role: 'user' | 'assistant' | 'system', content: string): void {
    this.memory.conversation.turns.push({
      role,
      content,
      timestamp: Date.now(),
    });
  }

  updateLongTerm(data: Partial<LongTermDriverMemory>): void {
    this.memory.longTerm = {
      ...this.memory.longTerm,
      ...data,
    };
  }

  save(): void {
    // Run privacy checks before final commit
    this.memory = MemoryPolicy.enforcePrivacy(this.memory);
  }
}
export default ContextStore;
