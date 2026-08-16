import { 
  DriverContext, DriverPreferences, BehaviorProfile, 
  LocationContext, NavigationContext, VehicleContext, SafetyContext, 
  LegalContext, DriverContextSnapshot 
} from './types';
import { DrivingStateResolver } from './DrivingStateResolver';
import { BehaviorAnalyzer } from './BehaviorAnalyzer';
import { ContextCache } from './ContextCache';
import { ContextPrivacyFilter } from './ContextPrivacyFilter';

export class DriverContextEngine {
  private preferences: DriverPreferences = {};
  private behaviorProfile: BehaviorProfile;
  private personalizationEnabled = true;
  private cache: ContextCache;

  private currentSpeed = 0;
  private telemetryQuality = 1.0;
  private navActive = false;
  private distRemaining = 0;
  private timeRemaining = 0;

  private roadSegment = 'unknown';
  private roadType: 'highway' | 'urban' | 'residential' | 'rural' = 'urban';
  private speedLimit = 50;
  private currentRestrictions: string[] = [];

  constructor() {
    this.cache = new ContextCache();
    this.behaviorProfile = {
      routeChoicePatterns: {},
      alertResponsePatterns: {},
      drivingPatterns: {},
      interactionPatterns: {},
      confidence: 1.0,
    };
    
    this.preferences = {};
  }

  isPersonalizationEnabled(): boolean {
    return this.personalizationEnabled;
  }

  setPersonalizationEnabled(enabled: boolean): void {
    this.personalizationEnabled = enabled;
    this.cache.invalidate();
  }

  updateTelemetry(speed: number, quality: number): void {
    this.currentSpeed = speed;
    this.telemetryQuality = quality;
    this.cache.invalidate();
  }

  updateNavigation(active: boolean, distRemaining?: number, timeRemaining?: number): void {
    this.navActive = active;
    this.distRemaining = distRemaining ?? 0;
    this.timeRemaining = timeRemaining ?? 0;
    this.cache.invalidate();
  }

  updateLocation(roadSegment: string, speedLimit: number, restrictions: string[]): void {
    this.roadSegment = roadSegment;
    this.speedLimit = speedLimit;
    this.currentRestrictions = restrictions;
    this.cache.invalidate();
  }

  recordLearnedPreference(key: keyof DriverPreferences, value: any): void {
    if (!this.personalizationEnabled) return;

    const current = this.preferences[key];
    const updated = BehaviorAnalyzer.recordSignal(current, value);
    this.preferences[key] = updated as any;
    this.cache.invalidate();
  }

  setExplicitPreference(key: keyof DriverPreferences, value: any): void {
    this.preferences[key] = {
      value,
      confidence: 1.0,
      evidenceCount: 1,
      lastObserved: Date.now(),
      source: 'EXPLICIT',
    } as any;
    this.cache.invalidate();
  }

  buildContext(): DriverContext {
    const cached = this.cache.get();
    if (cached) return cached;

    const drivingState = DrivingStateResolver.resolve(
      this.currentSpeed,
      this.navActive,
      this.distRemaining
    );

    const locationContext: LocationContext = {
      roadSegment: this.roadSegment,
      roadType: this.roadType,
      speedLimit: this.speedLimit,
      nearbyHazards: [],
      nearbyRestrictions: this.currentRestrictions,
      confidence: this.telemetryQuality,
    };

    const navigationContext: NavigationContext = {
      active: this.navActive,
      distanceRemainingMeters: this.distRemaining,
      timeRemainingSeconds: this.timeRemaining,
    };

    const vehicleContext: VehicleContext = {
      currentSpeed: this.currentSpeed,
      telemetryQuality: this.telemetryQuality,
    };

    const safetyContext: SafetyContext = {
      currentRisk: 'LOW',
      activeIncidents: [],
      recentIncidents: [],
      currentRiskTrend: 'STABLE',
    };

    const legalContext: LegalContext = {
      currentRestrictions: this.currentRestrictions,
      applicableSpeedLimit: this.speedLimit,
      vehicleRestrictions: [],
      confidence: 1.0,
    };

    const activePrefs = this.personalizationEnabled ? this.preferences : {};

    const rawContext: DriverContext = {
      timestamp: Date.now(),
      drivingState,
      locationContext,
      navigationContext,
      vehicleContext,
      safetyContext,
      legalContext,
      preferences: activePrefs,
      behaviorProfile: this.behaviorProfile,
      confidence: this.telemetryQuality,
    };

    const filtered = ContextPrivacyFilter.filter(rawContext);
    this.cache.set(filtered);
    return filtered;
  }

  buildSnapshot(): DriverContextSnapshot {
    return {
      timestamp: Date.now(),
      context: this.buildContext(),
      sourceVersions: { contextVersion: '1.0' },
    };
  }

  clearLearnedPreferences(): void {
    for (const key of Object.keys(this.preferences) as (keyof DriverPreferences)[]) {
      const pref = this.preferences[key];
      if (pref && pref.source === 'LEARNED') {
        delete this.preferences[key];
      }
    }
    this.cache.invalidate();
  }

  resetPersonalization(): void {
    this.preferences = {};
    this.behaviorProfile = {
      routeChoicePatterns: {},
      alertResponsePatterns: {},
      drivingPatterns: {},
      interactionPatterns: {},
      confidence: 1.0,
    };
    this.cache.invalidate();
  }
}
export default DriverContextEngine;
