import { DriveMemory } from './types';

export class MemoryPolicy {
  /**
   * Cleans and filters memory structures to remove PII or raw coordinates before storage.
   */
  static enforcePrivacy(memory: DriveMemory): DriveMemory {
    const cleanMemory = { ...memory };

    // Anonymize precise coordinates in currentTrip startLocation to protect driver privacy
    if (cleanMemory.currentTrip) {
      cleanMemory.currentTrip = {
        ...cleanMemory.currentTrip,
        startLocation: {
          latitude: Math.round(cleanMemory.currentTrip.startLocation.latitude * 100) / 100, // fuzzy rounding
          longitude: Math.round(cleanMemory.currentTrip.startLocation.longitude * 100) / 100,
        },
      };
    }

    return cleanMemory;
  }

  /**
   * Enforces that current authoritative state inputs win over historical memory context.
   */
  static resolveStateConflict<T>(authoritativeValue: T, historicalValue: T): T {
    if (authoritativeValue !== undefined && authoritativeValue !== null) {
      return authoritativeValue;
    }
    return historicalValue;
  }
}
export default MemoryPolicy;
