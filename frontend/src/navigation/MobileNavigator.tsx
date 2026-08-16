import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { DashboardScreen } from '../screens/DashboardScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { ChallanCalculatorScreen } from '../screens/ChallanCalculatorScreen';
import { EmergencyScreen } from '../screens/EmergencyScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { LocationScreen } from '../screens/LocationScreen';
import { VoiceAssistantScreen } from '../screens/VoiceAssistantScreen';
import { NavigationScreen } from '../screens/NavigationScreen';
import { useThemeColors } from '../context/ThemeContext';

const Stack = createStackNavigator();

export const MobileNavigator = () => {
  const colors = useThemeColors();

  return (
    <Stack.Navigator
      initialRouteName="Dashboard" // Launch straight to Dashboard inside the adaptive shell
      screenOptions={{
        headerStyle: { backgroundColor: colors.navy },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
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
      <Stack.Screen
        name="Navigation"
        component={NavigationScreen}
        options={{ title: 'Safety Navigation' }}
      />
    </Stack.Navigator>
  );
};

export default MobileNavigator;
