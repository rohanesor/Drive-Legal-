module.exports = {
  root: true,
  extends: ['@react-native'],
  rules: {
    'react-native/no-inline-styles': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
  },
  ignorePatterns: [
    'android/**',
    'frontend/android/**',
    'convex/_generated/**',
    '.convex/**',
    'node_modules/**',
    'backend/**',
    'python-service/**',
  ],
};
