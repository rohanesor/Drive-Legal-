module.exports = {
  preset: 'react-native',
  rootDir: '.',
  roots: ['<rootDir>/frontend/src', '<rootDir>/__tests__'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/frontend/src/$1',
    '^@react-native-async-storage/async-storage$': '<rootDir>/node_modules/@react-native-async-storage/async-storage',
    '^react-native$': '<rootDir>/node_modules/react-native',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-redux|@reduxjs/toolkit|react-native-paper|react-native-vector-icons|react-native-gesture-handler|react-native-safe-area-context|react-native-screens|react-native-reanimated|convex|lucide-react-native|@sentry)/)',
  ],
  collectCoverageFrom: [
    'frontend/src/**/*.{ts,tsx}',
    '!frontend/src/**/*.d.ts',
    '!frontend/src/convex/**',
    '!frontend/src/types/**',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  setupFiles: ['./jest.setup.js'],
};
