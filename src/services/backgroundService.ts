import { NativeModules, NativeEventEmitter, Platform, Alert } from 'react-native';
import { store } from '../store';
import { addAlert, ZoneAlert } from '../store/alertSlice';
import { addMessage } from '../store/chatSlice';

const { DriveLegalLocationService } = NativeModules;

const eventEmitter = Platform.OS === 'android'
  ? new NativeEventEmitter(DriveLegalLocationService)
  : null;

export const startLocationService = async (): Promise<void> => {
  if (Platform.OS === 'android') {
    try {
      await DriveLegalLocationService.startService();
    } catch (error) {
      console.error('Failed to start location service:', error);
    }
  }
};

export const stopLocationService = async (): Promise<void> => {
  if (Platform.OS === 'android') {
    try {
      await DriveLegalLocationService.stopService();
    } catch (error) {
      console.error('Failed to stop location service:', error);
    }
  }
};

export const setupLocationListener = (): void => {
  if (!eventEmitter) return;

  eventEmitter.addListener('onLocationUpdate', (data: any) => {
    const { latitude, longitude } = data;
    const { getState } = store;
    const currentState = getState().settings.state;

    store.dispatch({
      type: 'alerts/checkZone',
      payload: { lat: latitude, lng: longitude, state: currentState },
    });
  });

  eventEmitter.addListener('onZoneAlert', (alertData: ZoneAlert) => {
    store.dispatch(addAlert(alertData));

    Alert.alert(
      'DriveLegal Alert',
      alertData.message,
      [
        { text: 'Dismiss', style: 'cancel' },
        {
          text: 'Learn More',
          onPress: () => {
            store.dispatch(addMessage({
              id: Date.now().toString(),
              text: alertData.suggested_query || '',
              sender: 'user',
              timestamp: new Date(),
            }));
          },
        },
      ]
    );
  });
};

export const removeLocationListener = (): void => {
  if (!eventEmitter) return;
  eventEmitter.removeAllListeners('onLocationUpdate');
  eventEmitter.removeAllListeners('onZoneAlert');
};
