/**
 * NavigationSession.ts — Single Source of Truth for Vazhi Navigation State.
 * 
 * Shared across Mobile UI (Android/iOS), Android Auto, and Apple CarPlay.
 * Prevents dual-routing logic and ensures one active driving session.
 */

export interface GeoPoint {
  lat: number;
  lng: number;
  address?: string;
  name?: string;
}

export interface Maneuver {
  type: 'straight' | 'turn-left' | 'turn-right' | 'slight-left' | 'slight-right' | 'u-turn' | 'arrive';
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
}

export interface SafetyEvent {
  id: string;
  type: 'SPEED_LIMIT' | 'SPEED_BREAKER' | 'SHARP_CURVE' | 'HAIRPIN' | 'SCHOOL_ZONE' | 'RESTRICTED_ZONE' | 'ACCIDENT_ZONE' | 'STATE_BORDER' | 'TOLL';
  severity: 'low' | 'medium' | 'high';
  distanceMeters: number;
  message: string;
  recommendedAction: string;
}

export type VoiceState = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'SPEAKING' | 'ERROR';

export interface NavigationSessionState {
  sessionId: string | null;
  isNavigating: boolean;
  destination: GeoPoint | null;
  origin: GeoPoint | null;
  routeId: string | null;
  routeName: string | null;
  currentLocation: GeoPoint & { speedKmh?: number; heading?: number } | null;
  currentSegmentIndex: number;
  nextManeuver: Maneuver | null;
  eta: string | null;
  distanceRemainingMeters: number;
  durationRemainingSeconds: number;
  safetyScore: number;
  activeSafetyEvents: SafetyEvent[];
  voiceState: VoiceState;
  stateBorderLabel?: string;
  is3DMode: boolean;
}

class NavigationSessionManager {
  private state: NavigationSessionState = {
    sessionId: null,
    isNavigating: false,
    destination: null,
    origin: null,
    routeId: null,
    routeName: null,
    currentLocation: null,
    currentSegmentIndex: 0,
    nextManeuver: null,
    eta: null,
    distanceRemainingMeters: 0,
    durationRemainingSeconds: 0,
    safetyScore: 100,
    activeSafetyEvents: [],
    voiceState: 'IDLE',
    is3DMode: true,
  };

  private listeners: ((state: NavigationSessionState) => void)[] = [];

  public getState(): NavigationSessionState {
    return { ...this.state };
  }

  public subscribe(listener: (state: NavigationSessionState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    const snapshot = this.getState();
    this.listeners.forEach(listener => listener(snapshot));
  }

  public startSession(origin: GeoPoint, destination: GeoPoint, routeId: string, routeName: string): void {
    this.state = {
      ...this.state,
      sessionId: `vazhi_session_${Date.now()}`,
      isNavigating: true,
      origin,
      destination,
      routeId,
      routeName,
      currentSegmentIndex: 0,
      nextManeuver: {
        type: 'straight',
        instruction: 'Proceed onto main highway corridor',
        distanceMeters: 500,
        durationSeconds: 30,
      },
      eta: new Date(Date.now() + 3600 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      distanceRemainingMeters: 45000,
      durationRemainingSeconds: 3600,
      safetyScore: 95,
    };
    this.notify();
  }

  public updateLocation(lat: number, lng: number, speedKmh: number = 0, heading: number = 0): void {
    this.state.currentLocation = { lat, lng, speedKmh, heading };
    
    // Auto speed adaptive pitch evaluation
    if (speedKmh > 70 && !this.state.is3DMode) {
      this.state.is3DMode = true;
    }
    
    this.notify();
  }

  public updateManeuver(maneuver: Maneuver, distanceRemaining: number, durationRemaining: number): void {
    this.state.nextManeuver = maneuver;
    this.state.distanceRemainingMeters = distanceRemaining;
    this.state.durationRemainingSeconds = durationRemaining;
    this.notify();
  }

  public setVoiceState(voiceState: VoiceState): void {
    this.state.voiceState = voiceState;
    this.notify();
  }

  public toggle3DMode(enabled?: boolean): void {
    this.state.is3DMode = enabled !== undefined ? enabled : !this.state.is3DMode;
    this.notify();
  }

  public triggerSafetyEvent(event: SafetyEvent): void {
    this.state.activeSafetyEvents = [event, ...this.state.activeSafetyEvents.slice(0, 4)];
    this.notify();
  }

  public endSession(): void {
    this.state = {
      ...this.state,
      sessionId: null,
      isNavigating: false,
      destination: null,
      routeId: null,
      nextManeuver: null,
      distanceRemainingMeters: 0,
      durationRemainingSeconds: 0,
      activeSafetyEvents: [],
      voiceState: 'IDLE',
    };
    this.notify();
  }
}

export const navigationSessionManager = new NavigationSessionManager();
