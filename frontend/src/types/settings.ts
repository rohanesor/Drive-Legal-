export interface SettingsState {
  language: 'en' | 'ta' | 'hi';
  state: string;
  darkMode: boolean;
  notificationsEnabled: boolean;
  zoneAlertsNotificationEnabled: boolean;
  speedWarningsNotificationEnabled: boolean;
  remindersNotificationEnabled: boolean;
  locationAlertsEnabled: boolean;
  showDisclaimerAlways: boolean;
  preferredMode: 'auto' | 'mobile' | 'car';
  autoModeDetection: boolean;
}
