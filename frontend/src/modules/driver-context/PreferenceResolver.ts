import { PreferenceItem } from './types';

export class PreferenceResolver {
  /**
   * Resolves a preference value respecting the strict authority hierarchy:
   * SAFETY > LEGAL > EXPLICIT > LEARNED > DEFAULT
   */
  static resolvePreference<T>(
    preference: PreferenceItem<T> | undefined,
    defaultValue: T,
    safetyOverride?: T,
    legalOverride?: T
  ): T {
    if (safetyOverride !== undefined) {
      return safetyOverride;
    }

    if (legalOverride !== undefined) {
      return legalOverride;
    }

    if (preference) {
      if (preference.source === 'EXPLICIT') {
        return preference.value;
      }
      if (preference.source === 'LEARNED') {
        return preference.value;
      }
    }

    return defaultValue;
  }
}
export default PreferenceResolver;
