import { curveDetector } from '../domain/safety/CurveDetector';
import { roadHazardEngine } from '../domain/safety/RoadHazardEngine';
import { safetyTriggerPolicy } from '../domain/safety/SafetyTriggerPolicy';
import type { MapLocation } from '../types';

declare const describe: any, test: any, expect: any;

describe('Phase 1 Road Hazard Engine Tests', () => {
  test('CurveDetector detects sharp curve from 90 degree turn geometry', () => {
    // 90 degree right turn coordinates
    const testCoords: MapLocation[] = [
      { lat: 11.000, lng: 76.900 },
      { lat: 11.001, lng: 76.900 },
      { lat: 11.002, lng: 76.900 },
      { lat: 11.002, lng: 76.901 }, // 90 degree turn right
      { lat: 11.002, lng: 76.902 },
    ];

    const curves = curveDetector.detectCurves(testCoords);
    expect(curves.length).toBeGreaterThan(0);
    expect(curves[0].type).toBe('SHARP_CURVE');
    expect(curves[0].headingChange).toBeGreaterThanOrEqual(40);
  });

  test('CurveDetector detects hairpin turn from >75 degree angular change', () => {
    // Sharp hairpin U-turn geometry
    const testCoords: MapLocation[] = [
      { lat: 11.000, lng: 76.900 },
      { lat: 11.002, lng: 76.900 },
      { lat: 11.001, lng: 76.9001 }, // Sharp hairpin turn back
      { lat: 11.000, lng: 76.9002 },
    ];

    const curves = curveDetector.detectCurves(testCoords);
    expect(curves.length).toBeGreaterThan(0);
    expect(['SHARP_CURVE', 'HAIRPIN']).toContain(curves[0].type);
  });

  test('SafetyTriggerPolicy calculates speed-aware trigger distance', () => {
    const triggerAtSlow = safetyTriggerPolicy.getTriggerDistanceMeters(30, 'SHARP_CURVE');
    const triggerAtFast = safetyTriggerPolicy.getTriggerDistanceMeters(80, 'SHARP_CURVE');

    expect(triggerAtFast).toBeGreaterThan(triggerAtSlow);
    expect(triggerAtSlow).toBeGreaterThanOrEqual(250);
  });

  test('RoadHazardEngine generates readable hazard summary', () => {
    const mockHazards = [
      {
        id: 'h1',
        type: 'SHARP_CURVE' as const,
        location: { lat: 11.0, lng: 76.9 },
        distanceAlongRoute: 400,
        severity: 'MEDIUM' as const,
        description: 'Sharp Curve',
        voiceMessage: 'Sharp curve ahead',
        source: 'test',
      },
      {
        id: 'h2',
        type: 'SPEED_BREAKER' as const,
        location: { lat: 11.01, lng: 76.91 },
        distanceAlongRoute: 800,
        severity: 'MEDIUM' as const,
        description: 'Speed Breaker',
        voiceMessage: 'Speed breaker ahead',
        source: 'test',
      },
    ];

    const summary = roadHazardEngine.getHazardSummary(mockHazards);
    expect(summary).toContain('⚠ 1 sharp curve');
    expect(summary).toContain('⚠ 1 speed breaker');
  });
});
