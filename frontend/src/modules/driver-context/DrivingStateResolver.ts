import { DrivingState } from './types';

export class DrivingStateResolver {
  /**
   * Resolves the driver's current status state from vehicle speed, GPS, and routing.
   */
  static resolve(
    currentSpeedKmH?: number,
    navActive?: boolean,
    distanceRemainingMeters?: number
  ): DrivingState {
    if (currentSpeedKmH === undefined) {
      return 'PARKED';
    }

    if (currentSpeedKmH > 5) {
      if (navActive && distanceRemainingMeters !== undefined && distanceRemainingMeters < 200) {
        return 'ARRIVING';
      }
      return 'DRIVING';
    }

    if (currentSpeedKmH === 0) {
      if (navActive) {
        return 'STOPPED';
      }
      return 'PARKED';
    }

    return 'STARTING_TRIP';
  }
}
export default DrivingStateResolver;
