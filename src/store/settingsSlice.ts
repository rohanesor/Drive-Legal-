import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SettingsState {
  language: 'en' | 'ta' | 'hi';
  state: string;
  darkMode: boolean;
  notificationsEnabled: boolean;
  locationAlertsEnabled: boolean;
  showDisclaimerAlways: boolean;
}

const initialState: SettingsState = {
  language: 'en',
  state: 'TN',
  darkMode: false,
  notificationsEnabled: true,
  locationAlertsEnabled: false,
  showDisclaimerAlways: false,
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
    toggleLocationAlerts: (state) => {
      state.locationAlertsEnabled = !state.locationAlertsEnabled;
    },
    toggleDisclaimerAlways: (state) => {
      state.showDisclaimerAlways = !state.showDisclaimerAlways;
    },
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
  toggleLocationAlerts,
  toggleDisclaimerAlways,
  loadSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;
