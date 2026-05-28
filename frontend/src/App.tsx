import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider, useDispatch } from 'react-redux';
import { ConvexProvider } from 'convex/react';
import { store } from './store';
import { convexClient } from './convex/client';
import { syncService } from './services/syncService';
import { setSyncStatus, setLastSync } from './store/convexSlice';
import { SplashScreen } from './screens/SplashScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { ChatScreen } from './screens/ChatScreen';
import { ChallanCalculatorScreen } from './screens/ChallanCalculatorScreen';
import { EmergencyScreen } from './screens/EmergencyScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { LocationScreen } from './screens/LocationScreen';
import { VoiceAssistantScreen } from './screens/VoiceAssistantScreen';
import { PaperProvider } from 'react-native-paper';
import { COLORS } from './constants/theme';
import { LocationProvider } from './context/LocationContext';
import { setupLocationListener, removeLocationListener, startLocationService } from './services/backgroundService';

const Stack = createStackNavigator();

const SyncInitializer = ({ children }: { children: React.ReactNode }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    const initSync = async () => {
      dispatch(setSyncStatus('syncing'));

      const unsub = syncService.subscribe({
        onStatusChange: (status) => {
          dispatch(setSyncStatus(status));
        },
        onSyncComplete: () => {
          dispatch(setLastSync(Date.now()));
        },
      });

      const needsSync = await syncService.needsSync();
      if (needsSync) {
        syncService.syncAll();
      } else {
        syncService.checkConnection().then((online) => {
          dispatch(setSyncStatus(online ? 'online' : 'offline'));
        });
      }

      return unsub;
    };

    const cleanup = initSync();
    return () => {
      cleanup.then((fn) => fn?.());
    };
  }, [dispatch]);

  return <>{children}</>;
};

const AppContent = () => (
  <PaperProvider>
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.navy },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen
          name="Splash"
          component={SplashScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={{ title: 'AI Legal Assistant' }}
        />
        <Stack.Screen
          name="Calculator"
          component={ChallanCalculatorScreen}
          options={{ title: 'Challan Calculator' }}
        />
        <Stack.Screen
          name="Emergency"
          component={EmergencyScreen}
          options={{ title: 'Emergency Services' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Settings' }}
        />
        <Stack.Screen
          name="Location"
          component={LocationScreen}
          options={{ title: 'Select Jurisdiction' }}
        />
        <Stack.Screen
          name="VoiceAssistant"
          component={VoiceAssistantScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  </PaperProvider>
);

const App = () => {
  useEffect(() => {
    // Start listeners and location service if enabled
    setupLocationListener();
    const checkAndStartBackgroundService = async () => {
      const state = store.getState();
      if (state.settings.locationAlertsEnabled) {
        try {
          await startLocationService();
        } catch (e) {
          console.error("Failed to autostart background GPS service on launch:", e);
        }
      }
    };
    checkAndStartBackgroundService();

    return () => {
      removeLocationListener();
    };
  }, []);

  return (
    <Provider store={store}>
      <LocationProvider>
        {convexClient ? (
          <ConvexProvider client={convexClient}>
            <SyncInitializer>
              <AppContent />
            </SyncInitializer>
          </ConvexProvider>
        ) : (
          <AppContent />
        )}
      </LocationProvider>
    </Provider>
  );
};

export default App;
