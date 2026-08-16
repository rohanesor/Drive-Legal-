import { RouteSegment, RouteRequest } from './types';

export class RouteCostEngine {
  static calculateSegmentCost(
    segment: RouteSegment,
    request: RouteRequest,
    weights: { distanceWeight: number; durationWeight: number; riskWeight: number }
  ): number {
    const distanceCost = segment.distanceMeters * weights.distanceWeight;
    const durationCost = segment.estimatedDuration * weights.durationWeight;
    const riskCost = segment.risk * 1000 * weights.riskWeight;

    let restrictionPenalty = 0;
    if (request.constraints?.avoidRestrictedRoads && segment.restrictions.length > 0) {
      restrictionPenalty = 5000;
    }

    let hazardPenalty = 0;
    if (segment.hazards.length > 0) {
      hazardPenalty = 2000;
    }

    return distanceCost + durationCost + riskCost + restrictionPenalty + hazardPenalty;
  }
}
export default RouteCostEngine;
