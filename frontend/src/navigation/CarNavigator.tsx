import React from 'react';
import {
  createStackNavigator,
  CardStyleInterpolators,
} from '@react-navigation/stack';
import { CarDashboardScreen } from '../screens/car/CarDashboardScreen';
import { CarVoiceScreen } from '../screens/car/CarVoiceScreen';
import { CarEmergencyScreen } from '../screens/car/CarEmergencyScreen';
import { CarAlertScreen } from '../screens/car/CarAlertScreen';

const Stack = createStackNavigator();

export const CarNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="CarDashboard"
      screenOptions={{
        headerShown: false,
        gestureEnabled: false, // Banned gestures in driving for safety
        cardStyleInterpolator: CardStyleInterpolators.forFadeFromBottomAndroid, // Clean instant fade
      }}
    >
      <Stack.Screen name="CarDashboard" component={CarDashboardScreen} />
      <Stack.Screen name="CarVoice" component={CarVoiceScreen} />
      <Stack.Screen name="CarEmergency" component={CarEmergencyScreen} />
      <Stack.Screen name="CarAlert" component={CarAlertScreen} />
    </Stack.Navigator>
  );
};

export default CarNavigator;
