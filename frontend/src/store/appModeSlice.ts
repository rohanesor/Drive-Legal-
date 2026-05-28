import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AppModeState {
  mode: 'mobile' | 'car';             // Active application mode
  detectionMethod: 'auto' | 'manual';   // Mode switching mechanism
  isDriving: boolean;                  // Accelerometer/GPS-based driving state
  isCarDocked: boolean;                // USB/Bluetooth connection to car state
  lastModeSwitch: number;              // Timestamp of the last switch
  carModePreferences: {
    autoVoice: boolean;                // Automatically start voice assistant in Car Mode
    reducedAnimations: boolean;        // Disable animations for performance in Car Mode
    largeText: boolean;                // Enforce large accessible fonts
    hapticFeedback: boolean;           // Tactile feedback on screen interactions
  };
}

const initialState: AppModeState = {
  mode: 'mobile',
  detectionMethod: 'manual',
  isDriving: false,
  isCarDocked: false,
  lastModeSwitch: Date.now(),
  carModePreferences: {
    autoVoice: true,
    reducedAnimations: true,
    largeText: true,
    hapticFeedback: true,
  },
};

const appModeSlice = createSlice({
  name: 'appMode',
  initialState,
  reducers: {
    setMode: (state, action: PayloadAction<{ mode: 'mobile' | 'car'; method: 'auto' | 'manual' }>) => {
      state.mode = action.payload.mode;
      state.detectionMethod = action.payload.method;
      state.lastModeSwitch = Date.now();
    },
    setDriving: (state, action: PayloadAction<boolean>) => {
      state.isDriving = action.payload;
    },
    setCarDocked: (state, action: PayloadAction<boolean>) => {
      state.isCarDocked = action.payload;
    },
    toggleAutoVoice: (state) => {
      state.carModePreferences.autoVoice = !state.carModePreferences.autoVoice;
    },
    toggleReducedAnimations: (state) => {
      state.carModePreferences.reducedAnimations = !state.carModePreferences.reducedAnimations;
    },
    toggleLargeText: (state) => {
      state.carModePreferences.largeText = !state.carModePreferences.largeText;
    },
    toggleHapticFeedback: (state) => {
      state.carModePreferences.hapticFeedback = !state.carModePreferences.hapticFeedback;
    },
    loadAppModePreferences: (state, action: PayloadAction<Partial<AppModeState>>) => {
      return {
        ...state,
        ...action.payload,
        carModePreferences: {
          ...state.carModePreferences,
          ...action.payload.carModePreferences,
        },
      };
    },
  },
});

export const {
  setMode,
  setDriving,
  setCarDocked,
  toggleAutoVoice,
  toggleReducedAnimations,
  toggleLargeText,
  toggleHapticFeedback,
  loadAppModePreferences,
} = appModeSlice.actions;

export default appModeSlice.reducer;
