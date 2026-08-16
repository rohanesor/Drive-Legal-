import { DriverProfile, DrivingEvent, DriverMetrics, DriveScore } from './types';
import { DriverMetricsEngine } from './DriverMetricsEngine';
import { DriverTrendEngine } from './DriverTrendEngine';
import { DriverRecommendationEngine } from './DriverRecommendationEngine';

export class DriverIntelligenceEngine {
  private profile!: DriverProfile;
  private eventHistory: DrivingEvent[] = [];
  private minimumSampleEvents = 5;

  constructor() {
    this.resetPersonalization();
  }

  resetPersonalization(): void {
    this.eventHistory = [];
    this.profile = {
      driverId: 'anon_driver_123',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      preferences: {
        alertPreference: 'STANDARD',
        alertTiming: 'STANDARD',
        alertFrequency: 'NORMAL',
        preferredLanguage: 'en',
        preferredRouteType: 'BALANCED',
        preferredRiskTolerance: 'STANDARD',
      },
      baselineState: 'INSUFFICIENT_DATA',
      metrics: {
        speedCompliance: 1.0,
        speedExcess: 0,
        hardBraking: 0,
        acceleration: 0,
        routeDeviation: 0,
        warningResponse: 1.0,
        riskExposure: 0,
        legalEvents: 0,
        dataQuality: 0.0,
      },
      trends: {
        speed: 'UNKNOWN',
      },
      privacySettings: {
        localOnly: true,
      },
      profileVersion: '1.0.0',
    };
  }

  getProfile(): DriverProfile {
    return this.profile;
  }

  recordEvent(event: DrivingEvent): void {
    this.eventHistory.push(event);
    this.profile.updatedAt = Date.now();

    const updatedMetrics = DriverMetricsEngine.calculateMetrics(this.eventHistory);
    this.profile.metrics = updatedMetrics;

    if (this.eventHistory.length >= this.minimumSampleEvents) {
      this.profile.baselineState = 'ESTABLISHED';
    } else {
      this.profile.baselineState = 'INITIALIZING';
    }

    const historicMetrics: DriverMetrics = {
      ...updatedMetrics,
      speedCompliance: 0.8,
    };
    this.profile.trends['speed'] = DriverTrendEngine.evaluateTrend(updatedMetrics, historicMetrics);
  }

  getDriveScore(): DriveScore {
    const metrics = this.profile.metrics;
    const overall = (metrics.speedCompliance * 60 + (1.0 - Math.min(1.0, metrics.hardBraking / 10)) * 40);

    return {
      overall,
      speed: metrics.speedCompliance * 100,
      braking: Math.max(0, 100 - metrics.hardBraking * 10),
      acceleration: 100,
      legal: 100,
      risk: 100,
      consistency: 100,
      confidence: this.eventHistory.length >= this.minimumSampleEvents ? 0.9 : 0.4,
      sampleSize: this.eventHistory.length,
      timestamp: Date.now(),
      version: '1.0',
    };
  }

  getRecommendations(): string[] {
    return DriverRecommendationEngine.generateRecommendations(this.profile.metrics);
  }

  deleteProfile(): void {
    this.resetPersonalization();
  }

  exportData(): string {
    return JSON.stringify({
      profile: this.profile,
      events: this.eventHistory,
    });
  }

  shouldSuppressAlert(alertType: 'CRITICAL_RISK' | 'TEMPORARY_INFO'): boolean {
    if (alertType === 'CRITICAL_RISK') {
      return false;
    }
    return this.profile.preferences.alertFrequency === 'LOW';
  }

  updatePreferences(pref: Partial<DriverProfile['preferences']>): void {
    this.profile.preferences = { ...this.profile.preferences, ...pref };
  }
}
export default DriverIntelligenceEngine;
