import { Alert } from 'react-native';
import { store } from '../store';
import { setMode, setDriving, setCarDocked } from '../store/appModeSlice';

class ModeDetectionService {
  private static instance: ModeDetectionService;
  private speedCheckInterval: NodeJS.Timeout | null = null;
  private locationUnsubscribe: (() => void) | null = null;

  private constructor() {}

  public static getInstance(): ModeDetectionService {
    if (!ModeDetectionService.instance) {
      ModeDetectionService.instance = new ModeDetectionService();
    }
    return ModeDetectionService.instance;
  }

  /**
   * Evaluates current speed and triggers auto mode change suggestions if enabled
   * @param speed Current speed in km/h from GPS
   */
  public handleSpeedUpdate(speed: number) {
    const state = store.getState();
    const isAutoDetectEnabled = state.settings.autoModeDetection;
    const currentMode = state.appMode.mode;
    const isDriving = state.appMode.isDriving;

    // Determine driving threshold (e.g. > 15 km/h is considered driving)
    const drivingThreshold = 15;
    const newIsDriving = speed >= drivingThreshold;

    if (newIsDriving !== isDriving) {
      store.dispatch(setDriving(newIsDriving));
    }

    // Auto-detect triggers suggesting Car Mode
    if (isAutoDetectEnabled && currentMode === 'mobile' && speed > 20) {
      this.promptForCarMode();
    }
  }

  /**
   * Simulates Bluetooth Car Dock connection detection
   */
  public handleBluetoothConnectionChange(isConnected: boolean, deviceName?: string) {
    const state = store.getState();
    const isAutoDetectEnabled = state.settings.autoModeDetection;
    const currentMode = state.appMode.mode;

    store.dispatch(setCarDocked(isConnected));

    if (isConnected && isAutoDetectEnabled && currentMode === 'mobile') {
      Alert.alert(
        '🚗 Car System Connected',
        `We detected connection to "${deviceName || 'My Car BT'}". Switch to driver-safe Car Mode?`,
        [
          { text: 'Keep Mobile', style: 'cancel' },
          { 
            text: 'Switch to Car Mode', 
            onPress: () => {
              store.dispatch(setMode({ mode: 'car', method: 'auto' }));
            }
          }
        ]
      );
    }
  }

  /**
   * Display a non-intrusive modal suggestion to switch to Car Mode
   */
  private promptForCarMode() {
    Alert.alert(
      '🚗 Driving Detected',
      'It looks like you are driving. Switch to Car Mode for a distraction-free HUD and voice assistant?',
      [
        { text: 'Dismiss', style: 'cancel' },
        { 
          text: 'Switch to Car Mode', 
          onPress: () => {
            store.dispatch(setMode({ mode: 'car', method: 'auto' }));
          }
        }
      ]
    );
  }
}

export const modeDetection = ModeDetectionService.getInstance();
export default modeDetection;
