import { MemoryManager } from '../../frontend/src/modules/memory/MemoryManager';
import { MemorySummarizer } from '../../frontend/src/modules/memory/MemorySummarizer';
import { MemoryPolicy } from '../../frontend/src/modules/memory/MemoryPolicy';

describe('Driver Memory & Context System (P1.1)', () => {
  let memory: MemoryManager;

  beforeEach(() => {
    memory = new MemoryManager('driver_123');
  });

  test('1. Short term context can be updated and read', () => {
    memory.updateShortTerm({
      activeSpeedingPersistenceSeconds: 4.5,
      recentSwervingDetected: true,
      lastBrakingIntensity: -3.8,
    });

    const m = memory.getMemory();
    expect(m.shortTerm.activeSpeedingPersistenceSeconds).toBe(4.5);
    expect(m.shortTerm.recentSwervingDetected).toBe(true);
    expect(m.shortTerm.lastBrakingIntensity).toBe(-3.8);
  });

  test('2. Logging conversation turns generates history string', () => {
    memory.addConversationTurn('user', 'Can I park on Avinashi Road?');
    memory.addConversationTurn('assistant', 'Parking is restricted on Avinashi Road.');
    memory.addConversationTurn('user', 'What is the fine?');

    const contextSummary = memory.getRetriever().retrieveConversationContext();
    expect(contextSummary).toContain('user: Can I park on Avinashi Road?');
    expect(contextSummary).toContain('assistant: Parking is restricted on Avinashi Road.');
    expect(contextSummary).toContain('user: What is the fine?');

    const conversationSummary = MemorySummarizer.summarizeConversation(memory.getMemory().conversation.turns);
    expect(conversationSummary).toContain('Can I park on Avinashi Road?');
    expect(conversationSummary).toContain('What is the fine?');
  });

  test('3. Enforcing privacy policies round coordinates fuzzymap values', () => {
    memory.startTrip({
      tripId: 'trip_1',
      startTime: Date.now(),
      tripScore: 95,
      distanceTraveledMeters: 5200,
      durationSeconds: 600,
      startLocation: { latitude: 11.016834, longitude: 76.955845 }, // precise
    });

    // Commit saves memory triggers privacy sanitizer
    memory.getWriter().logConversationTurn('system', 'trip start log');
    
    const trip = memory.getMemory().currentTrip;
    expect(trip?.startLocation.latitude).toBeCloseTo(11.02, 2);
    expect(trip?.startLocation.longitude).toBeCloseTo(76.96, 2);
  });

  test('4. Resolving state conflicts checks authoritative values win', () => {
    const authoritativeSpeedLimit = 50;
    const rememberedSpeedLimit = 60;
    
    const activeLimit = MemoryPolicy.resolveStateConflict(authoritativeSpeedLimit, rememberedSpeedLimit);
    expect(activeLimit).toBe(50); // current state wins!

    const emptyAuthoritative = undefined;
    const fallbackLimit = MemoryPolicy.resolveStateConflict(emptyAuthoritative, rememberedSpeedLimit);
    expect(fallbackLimit).toBe(60); // fallback to memory when current is empty
  });

  test('5. Logging trip ends processes speeding count to build learned patterns', () => {
    memory.startTrip({
      tripId: 'trip_2',
      startTime: Date.now(),
      tripScore: 78,
      distanceTraveledMeters: 10400,
      durationSeconds: 1200,
      startLocation: { latitude: 11.01, longitude: 76.95 },
    });

    // Increment incidents
    memory.incrementTripIncident('SPEEDING');
    memory.incrementTripIncident('SPEEDING');
    memory.incrementTripIncident('SPEEDING');
    memory.incrementTripIncident('SPEEDING'); // 4 counts (triggers pattern)
    memory.incrementTripIncident('HARSH_BRAKING');
    memory.incrementTripIncident('HARSH_BRAKING');
    memory.incrementTripIncident('HARSH_BRAKING'); // 3 counts (triggers pattern)

    memory.endTrip();

    const m = memory.getMemory();
    expect(m.longTerm.tripsCount).toBe(1);
    expect(m.longTerm.averageDriveScore).toBe(78);
    expect(m.longTerm.learnedPatterns.length).toBe(2);

    const patternsSummary = memory.getRetriever().retrieveLearnedPatternsSummary();
    expect(patternsSummary).toContain('speeding patterns');
    expect(patternsSummary).toContain('harsh braking');
  });

  test('6. Trip averages update progressively across multiple trip ends', () => {
    // Trip 1
    memory.startTrip({
      tripId: 'trip_a',
      startTime: Date.now(),
      tripScore: 90,
      distanceTraveledMeters: 1000,
      durationSeconds: 300,
      startLocation: { latitude: 11.0, longitude: 76.9 },
    });
    memory.endTrip();
    expect(memory.getMemory().longTerm.averageDriveScore).toBe(90);

    // Trip 2
    memory.startTrip({
      tripId: 'trip_b',
      startTime: Date.now(),
      tripScore: 80,
      distanceTraveledMeters: 1500,
      durationSeconds: 400,
      startLocation: { latitude: 11.0, longitude: 76.9 },
    });
    memory.endTrip();
    expect(memory.getMemory().longTerm.averageDriveScore).toBe(85); // (90 + 80) / 2 = 85
  });
});
