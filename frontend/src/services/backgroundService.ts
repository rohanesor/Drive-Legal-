/**
 * Background Service Manager - Controls the Android foreground GPS service
 * 
 * PURPOSE:
 * Manages the Android foreground service that runs in the background
 * to monitor the user's location for traffic law zone alerts.
 * 
 * HOW IT WORKS:
 * 1. User enables "Location Alerts" in Settings
 * 2. This service starts the Android foreground service
 * 3. The Android service polls GPS every 30 seconds
 * 4. On each location update, it sends a broadcast event
 * 5. This TypeScript code listens for those events
 * 6. It calls the Python backend to check for zone alerts
 * 7. If an alert is found, it shows a notification to the user
 * 
 * NOTE: This module wraps the native Android service and provides
 * a JavaScript interface for React Native components to control it.
 */
import { NativeModules, NativeEventEmitter, Platform, Alert } from 'react-native';
import { store } from '../store';
import { addAlert, ZoneAlert } from '../store/alertSlice';
import { addMessage } from '../store/chatSlice';
import { checkZones } from './pythonBridge';

const { DriveLegalLocationService } = NativeModules;

// Event emitter for receiving broadcasts from the Android service
const eventEmitter = Platform.OS === 'android'
  ? new NativeEventEmitter(DriveLegalLocationService)
  : null;

/**
 * Start the background GPS monitoring service
 * Called when user enables "Location Alerts" in Settings
 */
export const startLocationService = async (): Promise<void> => {
  if (Platform.OS === 'android') {
    try {
      await DriveLegalLocationService.startService();
    } catch (error) {
      console.error('Failed to start location service:', error);
    }
  }
};

/**
 * Stop the background GPS monitoring service
 * Called when user disables "Location Alerts" in Settings
 */
export const stopLocationService = async (): Promise<void> => {
  if (Platform.OS === 'android') {
    try {
      await DriveLegalLocationService.stopService();
    } catch (error) {
      console.error('Failed to stop location service:', error);
    }
  }
};

/**
 * Set up listeners for location update events from the Android service
 * 
 * When a location update arrives:
 * 1. Extract lat/lng from the event
 * 2. Call Python backend to check for zone alerts
 * 3. If an alert is found, dispatch it to Redux store
 * 4. Show a native alert dialog with "Learn More" option
 */
export const setupLocationListener = (): void => {
  if (!eventEmitter) return;

  // Listen for GPS coordinate updates from the Android service
  eventEmitter.addListener('onLocationUpdate', async (data: any) => {
    const { latitude, longitude } = data;
    const { getState } = store;
    const currentState = getState().settings.state;

    // Check Python backend for zone alerts at this location
    try {
      const result = await checkZones({
        action: 'check_zone',
        location: { lat: latitude, lng: longitude, state: currentState },
      });

      // If a zone alert was found, dispatch it to Redux
      if (result.status === 'zone_alert' && result.message) {
        store.dispatch(addAlert({
          id: Date.now().toString(),
          zone_type: result.zone_type || 'custom',
          zone_name: result.zone_name || 'Unknown Zone',
          message: result.message,
          suggested_query: result.suggested_query || '',
          severity: (result.severity as 'low' | 'medium' | 'high') || 'medium',
          timestamp: Date.now(),
          dismissed: false,
        }));

        // Show native alert dialog
        Alert.alert(
          'DriveLegal Alert',
          result.message,
          [
            { text: 'Dismiss', style: 'cancel' },
            {
              text: 'Learn More',
              onPress: () => {
                // Open chat with pre-filled question about this zone
                store.dispatch(addMessage({
                  id: Date.now().toString(),
                  text: result.suggested_query || '',
                  sender: 'user',
                  timestamp: Date.now(),
                }));
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Zone check error:', error);
    }
  });
};

/**
 * Remove all location listeners
 * Called when the app is closing or user disables alerts
 */
export const removeLocationListener = (): void => {
  if (!eventEmitter) return;
  eventEmitter.removeAllListeners('onLocationUpdate');
  eventEmitter.removeAllListeners('onZoneAlert');
};
