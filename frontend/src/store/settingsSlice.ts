/**
 * Settings Slice - Redux state for user preferences
 *
 * Manages:
 * - language: UI and TTS language (en/ta/hi)
 * - state: Current Indian state for law lookup (TN/KN/AP/etc.)
 * - darkMode: UI theme toggle
 * - notificationsEnabled: Push notification toggle
 * - locationAlertsEnabled: Background GPS monitoring toggle
 * - showDisclaimerAlways: Show legal disclaimer on every response
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { SettingsState } from '../types';

const initialState: SettingsState = {
  language: 'en',
  state: 'TN', // Default to Tamil Nadu
  darkMode: false,
  notificationsEnabled: true,
  zoneAlertsNotificationEnabled: true,
  speedWarningsNotificationEnabled: true,
  remindersNotificationEnabled: true,
  locationAlertsEnabled: false,
  showDisclaimerAlways: false,
  preferredMode: 'auto',
  autoModeDetection: true,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setLanguage: (state, action: PayloadAction<'en' | 'ta' | 'hi'>) => {
      state.language = action.payload;
    },
    setState: (state, action: PayloadAction<string>) => {
      state.state = action.payload;
    },
    toggleDarkMode: (state) => {
      state.darkMode = !state.darkMode;
    },
    toggleNotifications: (state) => {
      state.notificationsEnabled = !state.notificationsEnabled;
    },
    toggleZoneAlertsNotification: (state) => {
      state.zoneAlertsNotificationEnabled = !state.zoneAlertsNotificationEnabled;
    },
    toggleSpeedWarningsNotification: (state) => {
      state.speedWarningsNotificationEnabled = !state.speedWarningsNotificationEnabled;
    },
    toggleRemindersNotification: (state) => {
      state.remindersNotificationEnabled = !state.remindersNotificationEnabled;
    },
    toggleLocationAlerts: (state) => {
      state.locationAlertsEnabled = !state.locationAlertsEnabled;
    },
    toggleDisclaimerAlways: (state) => {
      state.showDisclaimerAlways = !state.showDisclaimerAlways;
    },
    setPreferredMode: (
      state,
      action: PayloadAction<'auto' | 'mobile' | 'car'>,
    ) => {
      state.preferredMode = action.payload;
    },
    toggleAutoModeDetection: (state) => {
      state.autoModeDetection = !state.autoModeDetection;
    },
    // Load settings from AsyncStorage on app startup
    loadSettings: (state, action: PayloadAction<Partial<SettingsState>>) => {
      return { ...state, ...action.payload };
    },
  },
});

export const {
  setLanguage,
  setState,
  toggleDarkMode,
  toggleNotifications,
  toggleZoneAlertsNotification,
  toggleSpeedWarningsNotification,
  toggleRemindersNotification,
  toggleLocationAlerts,
  toggleDisclaimerAlways,
  setPreferredMode,
  toggleAutoModeDetection,
  loadSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;
