import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ChatScreen } from '../screens/ChatScreen';
import { ChallanCalculatorScreen } from '../screens/ChallanCalculatorScreen';
import { EmergencyScreen } from '../screens/EmergencyScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { LocationScreen } from '../screens/LocationScreen';
import { VoiceAssistantScreen } from '../screens/VoiceAssistantScreen';
import { NavigationScreen } from '../screens/NavigationScreen';
import { TripPlannerScreen } from '../screens/TripPlannerScreen';
import { useThemeColors } from '../context/ThemeContext';

const Stack = createStackNavigator();

export const MobileNavigator = () => {
  const colors = useThemeColors();

  return (
    <Stack.Navigator
      initialRouteName="Navigation" // Navigation map is now the default entry experience
      screenOptions={{
        headerStyle: { backgroundColor: colors.navy },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen
        name="Navigation"
        component={NavigationScreen}
        options={{ title: 'Vazhi Navigation' }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ title: 'AI Assistant' }}
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
        name="TripPlanner"
        component={TripPlannerScreen}
        options={{ title: 'Trip Planner' }}
      />
    </Stack.Navigator>
  );
};

export default MobileNavigator;
