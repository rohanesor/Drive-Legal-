import { AssistantContext } from './types';

export class ContextEngine {
  /**
   * Compiles diverse sub-engine data feeds into a unified AssistantContext model.
   * Degrades gracefully if sub-components are not present.
   */
  static compileContext(
    vehicleState: { currentSpeed: number; heading: number; vehicleType: 'car' | 'motorcycle' | 'heavy'; isEmergencyVehicle?: boolean },
    location: { latitude: number; longitude: number },
    routeContext?: any,
    driverRisk?: any,
    legalCompliance?: any,
    driveScore?: any,
    preferences?: any
  ): AssistantContext {
    return {
      timestamp: Date.now(),
      vehicleState,
      location,
      routeContext: routeContext || undefined,
      driverRisk: driverRisk || undefined,
      legalCompliance: legalCompliance || undefined,
      driveScore: driveScore || undefined,
      userPreferences: preferences || {
        voiceEnabled: true,
        alertFrequency: 'medium',
        navigationAlerts: true,
        legalAlerts: true,
        safetyAlerts: true,
      },
    };
  }
}
export default ContextEngine;
