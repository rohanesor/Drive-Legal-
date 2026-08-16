import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider, useDispatch } from 'react-redux';
import { store } from './store';
import { connectionManager } from './services/connectionManager';
import { SplashScreen } from './screens/SplashScreen';
import { PaperProvider } from 'react-native-paper';
import { LocationProvider } from './context/LocationContext';
import {
  setupLocationListener,
  removeLocationListener,
  startLocationService,
} from './services/backgroundService';
import { useAppMode } from './hooks/useAppMode';
import { MobileNavigator } from './navigation/MobileNavigator';
import { CarNavigator } from './navigation/CarNavigator';
import * as Sentry from '@sentry/react-native';
import { getSettings } from './services/storage';
import { loadSettings } from './store/settingsSlice';
import { ThemeProvider } from './context/ThemeContext';
import { notificationService } from './services/notificationService';


if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    sendDefaultPii: true,
    enableLogs: false,
  });
}

const Stack = createStackNavigator();

const AppContent = () => {
  const { mode } = useAppMode();
  const dispatch = useDispatch();

  useEffect(() => {
    const loadSettingsFromStorage = async () => {
      try {
        const stored = await getSettings();
        dispatch(loadSettings(stored as any));
      } catch (e) {
        console.error('Failed to load settings from storage on startup:', e);
      }
    };
    loadSettingsFromStorage();
  }, [dispatch]);

  return (
    <PaperProvider>
      <NavigationContainer>
        {mode === 'car' ? (
          <CarNavigator />
        ) : (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Mobile" component={MobileNavigator} />
          </Stack.Navigator>
        )}
      </NavigationContainer>
    </PaperProvider>
  );
};

const App = () => {
  useEffect(() => {
    // Initialize connection manager
    connectionManager.start();

    // Initialize push notifications
    notificationService.configure();
    notificationService.createChannels();

    // Start listeners and location service if enabled
    setupLocationListener();
    const checkAndStartBackgroundService = async () => {
      const state = store.getState();
      if (state.settings.locationAlertsEnabled) {
        try {
          await startLocationService();
        } catch (e) {
          console.error(
            'Failed to autostart background GPS service on launch:',
            e,
          );
        }
      }
    };
    checkAndStartBackgroundService();

    return () => {
      removeLocationListener();
      connectionManager.stop();
    };
  }, []);

  return (
    <Provider store={store}>
      <LocationProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </LocationProvider>
    </Provider>
  );
};

export default Sentry.wrap(App);
