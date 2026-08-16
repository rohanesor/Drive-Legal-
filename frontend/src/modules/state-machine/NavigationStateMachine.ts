import { NavigationState } from './types';

export class NavigationStateMachine {
  private state: NavigationState = 'NO_ROUTE';

  getState(): NavigationState {
    return this.state;
  }

  transition(next: NavigationState): boolean {
    const valid: Record<NavigationState, NavigationState[]> = {
      NO_ROUTE: ['ROUTE_PLANNED', 'NAVIGATION_ERROR'],
      ROUTE_PLANNED: ['NAVIGATING', 'NO_ROUTE', 'NAVIGATION_ERROR'],
      NAVIGATING: ['OFF_ROUTE', 'ARRIVED', 'NO_ROUTE', 'NAVIGATION_ERROR'],
      OFF_ROUTE: ['REROUTING', 'NAVIGATING', 'NO_ROUTE', 'NAVIGATION_ERROR'],
      REROUTING: ['NAVIGATING', 'OFF_ROUTE', 'NO_ROUTE', 'NAVIGATION_ERROR'],
      ARRIVED: ['NO_ROUTE'],
      NAVIGATION_ERROR: ['NO_ROUTE', 'ROUTE_PLANNED'],
    };

    const allowed = valid[this.state];
    if (allowed && allowed.includes(next)) {
      this.state = next;
      return true;
    }
    return false;
  }

  reset(): void {
    this.state = 'NO_ROUTE';
  }
}
export default NavigationStateMachine;
