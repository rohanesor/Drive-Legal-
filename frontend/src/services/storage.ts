/**
 * Storage Service - Persistent settings using AsyncStorage
 * 
 * AsyncStorage is React Native's equivalent of localStorage.
 * It persists data across app restarts.
 * 
 * What we store:
 * - User preferences (language, state, dark mode, etc.)
 * - Whether the legal disclaimer has been shown
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = '@DriveLegal_settings';
const DISCLAIMER_KEY = '@DriveLegal_disclaimer_shown';

export interface StoredSettings {
  language?: string;
  state?: string;
  darkMode?: boolean;
  notificationsEnabled?: boolean;
  locationAlertsEnabled?: boolean;
  showDisclaimerAlways?: boolean;
}

/**
 * Save user settings to persistent storage
 * Merges new settings with existing ones
 */
export const saveSettings = async (settings: StoredSettings): Promise<void> => {
  try {
    const existing = await getSettings();
    const merged = { ...existing, ...settings };
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
  } catch (error) {
    console.error('Error saving settings:', error);
  }
};

/**
 * Load user settings from persistent storage
 * Returns empty object if no settings exist yet
 */
export const getSettings = async (): Promise<StoredSettings> => {
  try {
    const settings = await AsyncStorage.getItem(SETTINGS_KEY);
    return settings ? JSON.parse(settings) : {};
  } catch (error) {
    console.error('Error getting settings:', error);
    return {};
  }
};

/**
 * Mark the legal disclaimer as shown (persists across sessions)
 */
export const setDisclaimerShown = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(DISCLAIMER_KEY, 'true');
  } catch (error) {
    console.error('Error saving disclaimer status:', error);
  }
};

/**
 * Check if the legal disclaimer has been shown before
 */
export const isDisclaimerShown = async (): Promise<boolean> => {
  try {
    const shown = await AsyncStorage.getItem(DISCLAIMER_KEY);
    return shown === 'true';
  } catch (error) {
    return false;
  }
};

/**
 * Clear all stored data (for testing or reset)
 */
export const clearStorage = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([SETTINGS_KEY, DISCLAIMER_KEY]);
  } catch (error) {
    console.error('Error clearing storage:', error);
  }
};
