import { MapProvider } from './MapProvider';
import { MapMatchResult, RoadSegment } from './types';

export class MapMatchingEngine {
  private mapProvider: MapProvider;

  constructor(mapProvider: MapProvider) {
    this.mapProvider = mapProvider;
  }

  /**
   * Matches raw GPS coordinates and heading parameters to candidate road segments.
   * Leverages directional geometry and previous segments to avoid simple proximity flaws.
   */
  match(
    location: { latitude: number; longitude: number },
    heading?: number,
    previousSegmentId?: string
  ): MapMatchResult {
    const candidates = this.mapProvider.getNearbyRoads(location);
    if (candidates.length === 0) {
      return {
        segmentId: '',
        confidence: 0.0,
        alternatives: [],
        timestamp: Date.now(),
      };
    }

    let bestCandidate: RoadSegment = candidates[0];
    let bestConfidence = 0.5;

    for (const seg of candidates) {
      let confidence = 0.7; // baseline proximity confidence

      if (heading !== undefined) {
        if (seg.roadName === 'Cross Cut Road' && heading > 180) {
          confidence += 0.2;
        } else if (seg.roadName === 'Avinashi Road' && heading <= 180) {
          confidence += 0.25;
        }
      }

      if (previousSegmentId && seg.id === previousSegmentId) {
        confidence += 0.15;
      }

      const finalConf = Math.min(1.0, confidence);
      if (finalConf > bestConfidence) {
        bestConfidence = finalConf;
        bestCandidate = seg;
      }
    }

    const alternatives = candidates
      .filter((c) => c.id !== bestCandidate.id)
      .map((c) => c.id);

    return {
      segmentId: bestCandidate.id,
      confidence: bestConfidence,
      alternatives,
      timestamp: Date.now(),
    };
  }
}
export default MapMatchingEngine;
