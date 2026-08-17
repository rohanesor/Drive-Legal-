import type { StackNavigationProp } from '@react-navigation/stack';

/**
 * Root navigation routes shared by Mobile and Car navigators.
 * Kept in sync with the screen `name` values in MobileNavigator / CarNavigator.
 */
export type MobileRouteName =
  | 'Dashboard'
  | 'Chat'
  | 'Calculator'
  | 'Emergency'
  | 'Settings'
  | 'Location'
  | 'VoiceAssistant'
  | 'Navigation'
  | 'TripPlanner';

export type CarRouteName =
  | 'CarDashboard'
  | 'CarVoice'
  | 'CarEmergency'
  | 'CarAlert';

export type AppRouteName = 'Splash' | 'Mobile' | MobileRouteName | CarRouteName;

/**
 * Route params for each screen.
 * Screens with no params use `undefined`.
 */
export type RootStackParamList = {
  Splash: undefined;
  Mobile: undefined;
  Dashboard: undefined;
  Chat: { initialQuery?: string } | undefined;
  Calculator: undefined;
  Emergency: undefined;
  Settings: undefined;
  Location: undefined;
  VoiceAssistant: undefined;
  Navigation: undefined;
  TripPlanner: undefined;
  CarDashboard: undefined;
  CarVoice: undefined;
  CarEmergency: undefined;
  CarAlert: undefined;
};

/**
 * Typed navigation prop for screens. Replaces the pervasive `{ navigation }: any`
 * pattern seen across the app.
 */
export type AppNavigationProp = StackNavigationProp<RootStackParamList>;
