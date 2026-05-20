/**
 * App.tsx - Root component of the DriveLegal application
 * 
 * THIS IS THE ENTRY POINT for the React Native UI.
 * 
 * It sets up:
 * 1. Redux Provider - Makes the store available to all components
 * 2. PaperProvider - Material Design component library
 * 3. NavigationContainer - React Navigation stack navigator
 * 4. Three screens: Chat (main), Settings, Location
 * 
 * Navigation structure:
 * ChatScreen (home) -> SettingsScreen
 *                  -> LocationScreen
 */
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider } from 'react-redux';
import { store } from './store';
import { SplashScreen } from './screens/SplashScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { ChatScreen } from './screens/ChatScreen';
import { ChallanCalculatorScreen } from './screens/ChallanCalculatorScreen';
import { EmergencyScreen } from './screens/EmergencyScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { LocationScreen } from './screens/LocationScreen';
import { PaperProvider } from 'react-native-paper';
import { COLORS } from './constants/theme';

const Stack = createStackNavigator();

const App = () => {
  return (
    <Provider store={store}>
      <PaperProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Splash"
            screenOptions={{
              headerStyle: { backgroundColor: COLORS.navy }, // DriveLegal Navy
              headerTintColor: '#ffffff',
              headerTitleStyle: { fontWeight: 'bold' },
            }}
          >
            {/* Splash Screen */}
            <Stack.Screen
              name="Splash"
              component={SplashScreen}
              options={{ headerShown: false }}
            />
            {/* Home Dashboard */}
            <Stack.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={{ headerShown: false }}
            />
            {/* Main AI chat screen */}
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={{ title: 'AI Legal Assistant' }}
            />
            {/* Challan Calculator */}
            <Stack.Screen
              name="Calculator"
              component={ChallanCalculatorScreen}
              options={{ title: 'Challan Calculator' }}
            />
            {/* Emergency Contacts */}
            <Stack.Screen
              name="Emergency"
              component={EmergencyScreen}
              options={{ title: 'Emergency Services' }}
            />
            {/* Settings screen - language, state, preferences */}
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ title: 'Settings' }}
            />
            {/* Location screen - manual state selection */}
            <Stack.Screen
              name="Location"
              component={LocationScreen}
              options={{ title: 'Select Jurisdiction' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </Provider>
  );
};

export default App;
