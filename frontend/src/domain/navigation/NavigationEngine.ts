import type { MapLocation, Route, RouteStep, RouteSearchParams } from '../../types';

export interface NavigationState {
  isNavigating: boolean;
  origin: MapLocation | null;
  destination: MapLocation | null;
  destinationName: string;
  routes: Route[];
  selectedRoute: Route | null;
  currentStepIndex: number;
  currentLocation: MapLocation | null;
  currentSpeed: number; // km/h
  distanceRemaining: number; // meters
  durationRemaining: number; // seconds
  currentStepInstruction: string;
}

export class NavigationEngine {
  private state: NavigationState = {
    isNavigating: false,
    origin: null,
    destination: null,
    destinationName: '',
    routes: [],
    selectedRoute: null,
    currentStepIndex: 0,
    currentLocation: null,
    currentSpeed: 0,
    distanceRemaining: 0,
    durationRemaining: 0,
    currentStepInstruction: '',
  };

  private listeners: ((state: NavigationState) => void)[] = [];

  getState(): NavigationState {
    return { ...this.state };
  }

  subscribe(listener: (state: NavigationState) => void): () => void {
    this.listeners.push(listener);
    listener({ ...this.state });
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l({ ...this.state }));
  }

  startNavigation(origin: MapLocation, destination: MapLocation, destName: string, routes: Route[], selectedRoute: Route) {
    this.state = {
      isNavigating: true,
      origin,
      destination,
      destinationName: destName,
      routes,
      selectedRoute,
      currentStepIndex: 0,
      currentLocation: origin,
      currentSpeed: 0,
      distanceRemaining: selectedRoute.distance,
      durationRemaining: selectedRoute.duration,
      currentStepInstruction: selectedRoute.steps[0]?.instruction || 'Proceed safely',
    };
    this.notify();
  }

  stopNavigation() {
    this.state = {
      isNavigating: false,
      origin: null,
      destination: null,
      destinationName: '',
      routes: [],
      selectedRoute: null,
      currentStepIndex: 0,
      currentLocation: null,
      currentSpeed: 0,
      distanceRemaining: 0,
      durationRemaining: 0,
      currentStepInstruction: '',
    };
    this.notify();
  }

  updateLocation(location: MapLocation, speed: number) {
    if (!this.state.isNavigating || !this.state.selectedRoute) {
      this.state.currentLocation = location;
      this.state.currentSpeed = speed;
      this.notify();
      return;
    }

    this.state.currentLocation = location;
    this.state.currentSpeed = speed;

    // 1. Check for route deviation
    const isDeviated = this.checkRouteDeviation(location);
    if (isDeviated) {
      console.log('[NavigationEngine] Route deviation detected!');
      // State is marked but recalculation is triggered externally by provider
      this.notify();
      return;
    }

    // 2. Progress track index along coordinates list
    const routeCoords = this.state.selectedRoute.coords;
    let closestIndex = this.state.currentStepIndex;
    let minDistance = Infinity;

    // Search around the current index to find closest coordinate
    const searchRange = 10;
    const start = Math.max(0, this.state.currentStepIndex - searchRange);
    const end = Math.min(routeCoords.length - 1, this.state.currentStepIndex + searchRange);

    for (let i = start; i <= end; i++) {
      const dist = this.haversineDistance(location, routeCoords[i]);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = i;
      }
    }

    this.state.currentStepIndex = closestIndex;

    // 3. Update remaining stats
    const steps = this.state.selectedRoute.steps;
    let currentStepIdx = 0;
    let accumulatedCoords = 0;

    // Find the step corresponding to coordinate index
    for (let i = 0; i < steps.length; i++) {
      const stepCoordsCount = Math.floor(routeCoords.length / steps.length);
      accumulatedCoords += stepCoordsCount;
      if (closestIndex <= accumulatedCoords) {
        currentStepIdx = i;
        break;
      }
    }

    const remainingSteps = steps.slice(currentStepIdx);
    this.state.distanceRemaining = remainingSteps.reduce((acc, s) => acc + s.distance, 0);
    this.state.durationRemaining = remainingSteps.reduce((acc, s) => acc + s.duration, 0);
    this.state.currentStepInstruction = steps[currentStepIdx]?.instruction || 'Proceed safely';

    this.notify();
  }

  checkRouteDeviation(location: MapLocation): boolean {
    if (!this.state.selectedRoute || this.state.selectedRoute.coords.length === 0) return false;
    
    // Find distance to the closest point on the route
    let minDistance = Infinity;
    for (const coord of this.state.selectedRoute.coords) {
      const dist = this.haversineDistance(location, coord);
      if (dist < minDistance) {
        minDistance = dist;
      }
    }

    // Deviation threshold: 120 meters
    return minDistance > 120;
  }

  haversineDistance(p1: MapLocation, p2: MapLocation): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
    const dLon = ((p2.lng - p1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((p1.lat * Math.PI) / 180) *
        Math.cos((p2.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

export const navigationEngine = new NavigationEngine();
