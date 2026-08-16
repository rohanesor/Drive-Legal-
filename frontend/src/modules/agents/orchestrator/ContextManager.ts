import { AgentContext, RealTimeContext, TripContext, SystemContext } from './types';

export class ContextManager {
  /**
   * Constructs the structured context frame, isolating sensitive data before exposing it to agents.
   */
  static buildContext(
    realTime: RealTimeContext,
    trip?: TripContext,
    system?: SystemContext,
    preferences?: any
  ): AgentContext {
    return {
      realTime: {
        speed: realTime.speed,
        heading: realTime.heading,
        latitude: realTime.latitude,
        longitude: realTime.longitude,
        vehicleType: realTime.vehicleType,
        isEmergencyVehicle: realTime.isEmergencyVehicle,
      },
      trip: {
        routeId: trip?.routeId,
        destinationName: trip?.destinationName,
        tripScore: trip?.tripScore,
      },
      system: {
        country: system?.country || 'IN',
        state: system?.state || 'TN',
        city: system?.city,
      },
      preferences: preferences || {
        voiceEnabled: true,
        alertFrequency: 'medium',
        navigationAlerts: true,
        legalAlerts: true,
        safetyAlerts: true,
      },
    };
  }
}
export default ContextManager;
