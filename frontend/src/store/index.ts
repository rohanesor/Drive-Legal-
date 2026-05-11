/**
 * Redux Store Configuration
 * 
 * The store is the central state container for the entire app.
 * All app data flows through here: chat messages, user settings, zone alerts.
 * 
 * Slices:
 * - chat: Messages, loading state, disclaimer tracking
 * - settings: Language, state, dark mode, notification preferences
 * - alerts: Zone alerts, cooldown tracking
 */
import { configureStore } from '@reduxjs/toolkit';
import chatReducer from './chatSlice';
import settingsReducer from './settingsSlice';
import alertReducer from './alertSlice';

// Create the Redux store with all reducers
export const store = configureStore({
  reducer: {
    chat: chatReducer,
    settings: settingsReducer,
    alerts: alertReducer,
  },
});

// TypeScript types for the store
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
