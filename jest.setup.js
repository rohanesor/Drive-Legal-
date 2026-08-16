// Jest setup for DriveLegal
// Mock native modules that are not available in test environment

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter', () => {
  const { EventEmitter } = require('events');
  return EventEmitter;
});

jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'android',
  Version: 34,
  select: jest.fn(),
}));

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.NativeModules = {
    ...RN.NativeModules,
    DriveLegalTTS: { speak: jest.fn() },
    DriveLegalSpeechRecognizer: { start: jest.fn() },
    DriveLegalLocationServiceModule: { startService: jest.fn() },
    PythonBridgeModule: { execute: jest.fn() },
  };
  return RN;
});
