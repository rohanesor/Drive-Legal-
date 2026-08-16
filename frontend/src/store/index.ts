/**
 * Redux Store
 *
 * Central state management for DriveLegal. Slices are organised by domain:
 * - chat:      Message history, loading state, disclaimer, suggested prompts
 * - settings:  User preferences (language, state, dark mode, toggles)
 * - alerts:    Zone-based push alerts with 30-min cooldown dedup
 * - convex:    Convex backend sync status (online/offline/syncing/error)
 * - appMode:   Mobile vs Car mode switching (auto/manual)
 */
import { configureStore } from '@reduxjs/toolkit';
import chatReducer from './chatSlice';
import settingsReducer from './settingsSlice';
import alertReducer from './alertSlice';
import convexReducer from './convexSlice';
import appModeReducer from './appModeSlice';

export const store = configureStore({
  reducer: {
    chat: chatReducer,
    settings: settingsReducer,
    alerts: alertReducer,
    convex: convexReducer,
    appMode: appModeReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
