/**
 * Test Helpers
 *
 * Shared testing utilities for DriveLegal tests.
 * - createMockStore: Creates a Redux store with a preloaded state for testing
 * - mockNavigation: Creates a mock navigation object for testing screens
 * - waitFor: Async helper to wait for conditions in tests
 */

import { configureStore } from '@reduxjs/toolkit';
import chatReducer from '../../frontend/src/store/chatSlice';
import settingsReducer from '../../frontend/src/store/settingsSlice';
import alertReducer from '../../frontend/src/store/alertSlice';
import convexReducer from '../../frontend/src/store/convexSlice';
import appModeReducer from '../../frontend/src/store/appModeSlice';

export function createMockStore(preloadedState?: Record<string, unknown>) {
  return configureStore({
    reducer: {
      chat: chatReducer,
      settings: settingsReducer,
      alerts: alertReducer,
      convex: convexReducer,
      appMode: appModeReducer,
    },
    preloadedState: preloadedState as any,
  });
}

export function mockNavigation() {
  return {
    navigate: jest.fn(),
    goBack: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    reset: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn(),
  };
}

export async function waitFor(condition: () => boolean, timeout = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (condition()) {
      return;
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error('waitFor: condition not met within timeout');
}
