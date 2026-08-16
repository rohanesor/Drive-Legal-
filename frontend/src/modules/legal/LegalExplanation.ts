export class LegalExplanation {
  /**
   * Translates violation categories to machine-readable reason codes.
   */
  static getReasonCode(category: string): string {
    switch (category) {
      case 'SPEED_LIMIT':
        return 'SPEED_LIMIT_EXCEEDED';
      case 'NO_ENTRY':
        return 'NO_ENTRY_VIOLATION';
      case 'ONE_WAY':
        return 'ONE_WAY_VIOLATION';
      case 'NO_PARKING':
        return 'PARKING_RESTRICTION_VIOLATION';
      case 'VEHICLE_RESTRICTION':
        return 'VEHICLE_CLASS_PROHIBITED';
      case 'TIME_RESTRICTION':
        return 'TEMPORAL_ACCESS_EXPIRED';
      default:
        return 'UNKNOWN_VIOLATION';
    }
  }

  /**
   * Refines a driver message to ensure it remains a helpful advisory rather than declaring absolute legal fines.
   */
  static getSafeAdvisoryMessage(category: string, baseExplanation: string): string {
    const notice = 'Potential traffic violation warning detected. driving behavior appears inconsistent with the configured traffic rule.';
    return `${notice} Details: ${baseExplanation}`;
  }
}
export default LegalExplanation;
