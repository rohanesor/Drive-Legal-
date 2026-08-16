module.exports = {
  root: true,
  extends: ['@react-native'],
  rules: {
    'react-native/no-inline-styles': 'off',
  },
  ignorePatterns: ['android/**', 'convex/_generated/**', '.convex/**'],
};
