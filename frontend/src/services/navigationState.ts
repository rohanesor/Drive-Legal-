export interface NavigationContext {
  isNavigating: boolean;
  destinationName?: string;
  distanceRemaining?: number; // meters
  durationRemaining?: number; // seconds
  currentStepInstruction?: string;
  routeSafetyScore?: number;
  activeRouteName?: string;
}

class NavigationStateService {
  private currentContext: NavigationContext = {
    isNavigating: false,
  };

  setContext(context: Partial<NavigationContext>) {
    this.currentContext = {
      ...this.currentContext,
      ...context,
    };
  }

  getContext(): NavigationContext {
    return this.currentContext;
  }

  reset() {
    this.currentContext = {
      isNavigating: false,
    };
  }
}

export const navigationState = new NavigationStateService();
export default navigationState;
