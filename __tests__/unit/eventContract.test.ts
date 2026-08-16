import { EventSchemaRegistry } from '../../frontend/src/modules/event-contract/EventSchemaRegistry';
import { DeadLetterQueue } from '../../frontend/src/modules/event-contract/DeadLetterQueue';
import { EventRecorder } from '../../frontend/src/modules/event-contract/EventRecorder';
import { EventReplayEngine } from '../../frontend/src/modules/event-contract/EventReplayEngine';
import { EventCatalog } from '../../frontend/src/modules/event-contract/EventCatalog';
import { DriveLegalEvent } from '../../frontend/src/modules/event-contract/types';
import { EventBus } from '../../frontend/src/modules/runtime/EventBus';

describe('Unified Event & Data Contract (P2.2)', () => {
  let baseEvent: DriveLegalEvent;

  beforeEach(() => {
    DeadLetterQueue.clear();

    baseEvent = {
      id: 'evt_123',
      type: 'location.updated',
      timestamp: Date.now(),
      eventId: 'evt_123',
      eventType: 'location.updated',
      eventVersion: 'v1',
      schemaVersion: '1.0',
      occurredAt: Date.now(),
      publishedAt: Date.now(),
      sequence: 1,
      source: 'gps',
      sourceVersion: '1.0.0',
      correlationId: 'corr_123',
      tripId: 'trip_123',
      payload: {
        latitude: 11.0168,
        longitude: 76.9558,
        accuracy: 10,
        observedAt: Date.now(),
        source: 'gps',
      },
      metadata: {},
      provenance: {
        source: 'gps',
        method: 'raw',
        capturedAt: Date.now(),
        derivedFrom: [],
      },
      confidence: {
        score: 0.95,
        level: 'HIGH',
        factors: [],
        confidenceSource: 'sensor',
      },
      trustLevel: 'VALIDATED',
    };
  });

  test('1. EventSchemaRegistry asserts valid envelope structure and payload values', () => {
    // Valid event
    const res = EventSchemaRegistry.validate(baseEvent);
    expect(res.valid).toBe(true);

    // Invalid latitude range
    const invalidLat = { ...baseEvent, payload: { ...baseEvent.payload, latitude: 120 } };
    const resLat = EventSchemaRegistry.validate(invalidLat);
    expect(resLat.valid).toBe(false);
    expect(resLat.errors).toContain("Invalid latitude: must be between -90 and 90");

    // Invalid accuracy range
    const invalidAcc = { ...baseEvent, payload: { ...baseEvent.payload, accuracy: -5 } };
    const resAcc = EventSchemaRegistry.validate(invalidAcc);
    expect(resAcc.valid).toBe(false);
    expect(resAcc.errors).toContain("Invalid accuracy: must be non-negative");
  });

  test('2. EventSchemaRegistry checks compatibility of event versions', () => {
    // Same versions -> compatible
    expect(EventSchemaRegistry.checkCompatibility('1.0', '1.0')).toBe('BACKWARD_COMPATIBLE');
    // Minor changes -> compatible
    expect(EventSchemaRegistry.checkCompatibility('1.0', '1.2')).toBe('BACKWARD_COMPATIBLE');
    // Major bump -> breaking
    expect(EventSchemaRegistry.checkCompatibility('1.0', '2.0')).toBe('BREAKING');
  });

  test('3. DeadLetterQueue retry policies handle transient vs non-transient failures', () => {
    // Validation failures -> non-retryable
    expect(DeadLetterQueue.isRetryable('Validation Error: lat out of range')).toBe(false);

    // Network failures -> retryable
    expect(DeadLetterQueue.isRetryable('Temporary network timeout occurred')).toBe(true);

    // Publish to DLQ
    DeadLetterQueue.publishToDLQ(baseEvent, 'Schema validation failure');
    const dlq = DeadLetterQueue.getDLQ();
    expect(dlq.length).toBe(1);
    expect(dlq[0].error).toBe('Schema validation failure');
  });

  test('4. EventRecorder filters high frequency raw location events unless requested', () => {
    const recorder = new EventRecorder();
    recorder.startRecording();

    // Sequence 1 location.updated (should be skipped)
    recorder.recordEvent(baseEvent);

    // Sequence 5 location.updated (should be recorded)
    const seq5 = { ...baseEvent, sequence: 5 };
    recorder.recordEvent(seq5);

    recorder.stopRecording();
    const recorded = recorder.getRecordedEvents();
    expect(recorded.length).toBe(1);
    expect(recorded[0].sequence).toBe(5);
  });

  test('5. EventReplayEngine enforces safety simulation mode, modifying metadata tags', async () => {
    const mockBus = new EventBus();
    const events: DriveLegalEvent[] = [baseEvent];

    let receivedEvent: any = null;
    mockBus.subscribe('location.updated', (event) => {
      receivedEvent = event;
    });

    await EventReplayEngine.replay(events, 'FAST', mockBus, true);
    expect(receivedEvent).not.toBeNull();
    expect(receivedEvent.metadata.runtimeMode).toBe('DEMO');
  });

  test('6. EventCatalog returns sensitivity limits and retention rules', () => {
    const catalog = EventCatalog.getCatalog();
    expect(catalog.length).toBeGreaterThan(0);
    const gpsEvent = catalog.find((c) => c.eventType === 'location.updated');
    expect(gpsEvent).toBeDefined();
    expect(gpsEvent?.sensitivity).toBe('HIGH');
    expect(gpsEvent?.retentionDays).toBe(1);
  });

  test('7. Fuzz testing handles random inputs gracefully', () => {
    const fuzzPayload = {
      latitude: 'corrupted-string' as any,
      longitude: NaN,
      accuracy: -100,
    };
    const fuzzed = { ...baseEvent, payload: fuzzPayload };
    const result = EventSchemaRegistry.validate(fuzzed);
    expect(result.valid).toBe(false);
  });
});
