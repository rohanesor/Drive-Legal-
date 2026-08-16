import { ContextEngine } from '../../frontend/src/modules/context-engine/ContextEngine';
import { GeofenceEngine } from '../../frontend/src/modules/context-engine/GeofenceEngine';
import { MapMatcher } from '../../frontend/src/modules/context-engine/MapMatcher';
import { compareContext } from '../../frontend/src/modules/context-engine/compareContext';
import { Zone, DriveContext } from '../../frontend/src/modules/context-engine/types';

describe('Context Intelligence Engine (P2.8)', () => {
  let engine: ContextEngine;
  let sampleZone: Zone;

  beforeEach(() => {
    engine = new ContextEngine();
    sampleZone = {
      id: 'school_zone_1',
      type: 'school',
      geometry: {
        latitude: 11.0168,
        longitude: 76.9558,
        radiusMeters: 100,
      },
      restrictions: ['SPEED_LIMIT_30'],
      source: 'official-dataset',
      version: '1.0',
    };
  });

  test('1. ContextEngine updates location, triggers map matching and derives night timeOfDay', () => {
    // 9 PM Night timestamp
    const timestamp = new Date('2026-08-16T21:00:00Z').getTime();
    engine.updateLocation(
      {
        latitude: 11.0168,
        longitude: 76.9558,
        heading: 90,
        speed: 70, // triggers Highway match heuristic (> 60)
        accuracy: 4,
        altitude: 400,
        timestamp,
      },
      [sampleZone]
    );

    const ctx = engine.getCurrentContext();
    expect(ctx.location.latitude).toBe(11.0168);
    expect(ctx.location.quality).toBe('HIGH');
    expect(ctx.road.roadClass).toBe('HIGHWAY'); // Speed > 60 triggers highway match
    expect(ctx.environment.timeOfDay).toBe('NIGHT');
  });

  test('2. GeofenceEngine handles hysteresis and debounces entrance triggers', () => {
    const geofence = new GeofenceEngine();

    // 1st step: inside zone
    let status = geofence.updatePosition(11.0168, 76.9558, [sampleZone]);
    expect(status.entered.length).toBe(0); // Needs 3 steps for state transition

    // 2nd step: inside zone
    status = geofence.updatePosition(11.0168, 76.9558, [sampleZone]);
    expect(status.entered.length).toBe(0);

    // 3rd step: inside zone -> trigger enter!
    status = geofence.updatePosition(11.0168, 76.9558, [sampleZone]);
    expect(status.entered).toContain('school_zone_1');
    expect(status.active).toContain('school_zone_1');
  });

  test('3. ContextEngine registers and tracks conflicts', () => {
    engine.handleConflict({
      field: 'speedLimit',
      sources: ['map', 'camera'],
      values: [50, 60],
      confidence: [0.95, 0.9],
      resolution: 'SOURCE_PRIORITY',
      reason: 'Map speed limit has higher priority authority.',
    });

    const conflicts = engine.getConflicts();
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].field).toBe('speedLimit');
  });

  test('4. compareContext diffs snapshots and filters micro GPS deviations (< 0.5m)', () => {
    const ctx1 = {
      ...engine.getCurrentContext(),
      location: {
        ...engine.getCurrentContext().location,
        latitude: 11.0168,
        longitude: 76.9558,
      },
    };

    // Micro-GPS change (~0.05 meters away)
    const ctx2 = {
      ...ctx1,
      location: {
        ...ctx1.location,
        latitude: 11.0168001,
        longitude: 76.9558001,
      },
    };

    let diff = compareContext(ctx1, ctx2);
    expect(diff.length).toBe(0); // Filtered out because distance < 0.5 meters

    // Significant GPS change (~500 meters away)
    const ctx3 = {
      ...ctx1,
      location: {
        ...ctx1.location,
        latitude: 11.02,
        longitude: 76.96,
      },
    };

    diff = compareContext(ctx1, ctx3);
    expect(diff).toContain('location');
  });
});
