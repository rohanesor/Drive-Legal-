import { NavigationState, NavigationInstruction, Route } from './types';

export class NavigationStateMachine {
  private state: NavigationState = 'IDLE';
  private activeRoute?: Route;
  private deviationCounter = 0;
  private minDeviationThreshold = 2; // debounced ticks before reroute

  getCurrentState(): NavigationState { return this.state; }
  getActiveRoute(): Route | undefined { return this.activeRoute; }

  selectRoute(route: Route): void {
    this.activeRoute = route;
    this.state = 'ROUTE_SELECTED';
    this.deviationCounter = 0;
  }

  startNavigation(): void {
    if (this.state === 'ROUTE_SELECTED') {
      this.state = 'NAVIGATING';
    }
  }

  updatePosition(
    location: { latitude: number; longitude: number },
    distanceToRouteMeters: number
  ): void {
    if (this.state !== 'NAVIGATING' && this.state !== 'DEVIATED') return;

    if (distanceToRouteMeters > 50) {
      this.deviationCounter++;
      this.state = 'DEVIATED';
      
      if (this.deviationCounter >= this.minDeviationThreshold) {
        this.state = 'REROUTING';
        console.log('[NavigationStateMachine] Reroute triggered due to persistent deviation.');
      }
    } else {
      this.deviationCounter = 0;
      this.state = 'NAVIGATING';
    }
  }

  completeReroute(newRoute: Route): void {
    this.activeRoute = newRoute;
    this.state = 'NAVIGATING';
    this.deviationCounter = 0;
  }

  arrive(): void {
    this.state = 'ARRIVED';
    this.activeRoute = undefined;
  }

  getInstructions(): NavigationInstruction[] {
    return [
      {
        type: 'TURN_LEFT',
        roadName: 'Cross Cut Road',
        distance: 150,
        direction: 'left',
        confidence: 0.95,
      },
      {
        type: 'ARRIVE',
        roadName: 'Destination Corner',
        distance: 2500,
        direction: 'straight',
        confidence: 0.99,
      },
    ];
  }
}
export default NavigationStateMachine;
