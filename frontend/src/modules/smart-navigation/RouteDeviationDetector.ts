export class RouteDeviationDetector {
  private deviationThresholdMeters = 50;
  private possibleDeviationCount = 0;
  private maxPossibleDeviationUpdates = 3;

  detectDeviation(distanceToRouteMeters: number): 'ON_ROUTE' | 'POSSIBLE_DEVIATION' | 'OFF_ROUTE' {
    if (distanceToRouteMeters <= this.deviationThresholdMeters) {
      this.possibleDeviationCount = 0;
      return 'ON_ROUTE';
    }

    this.possibleDeviationCount++;
    if (this.possibleDeviationCount >= this.maxPossibleDeviationUpdates) {
      return 'OFF_ROUTE';
    }
    return 'POSSIBLE_DEVIATION';
  }
}
export default RouteDeviationDetector;
