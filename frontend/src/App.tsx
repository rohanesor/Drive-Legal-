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
import { ChatScreen } from './screens/ChatScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { LocationScreen } from './screens/LocationScreen';
import { PaperProvider } from 'react-native-paper';

// Create a stack navigator (screens stack on top of each other)
const Stack = createStackNavigator();

const App = () => {
  return (
    // Redux Provider makes store available to all child components
    <Provider store={store}>
      {/* Material Design components from react-native-paper */}
      <PaperProvider>
        {/* Navigation container - manages screen transitions */}
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Chat"
            screenOptions={{
              headerStyle: { backgroundColor: '#1e40af' }, // DriveLegal blue
              headerTintColor: '#ffffff',
              headerTitleStyle: { fontWeight: 'bold' },
            }}
          >
            {/* Main chat screen - the home screen */}
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={{ title: 'DriveLegal' }}
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
              options={{ title: 'Location' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </Provider>
  );
};

export default App;
