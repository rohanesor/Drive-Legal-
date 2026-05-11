/**
 * Babel configuration for React Native
 * Transforms modern JavaScript/TypeScript for mobile runtime
 */
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    ['@babel/plugin-transform-runtime', { helpers: true }],
  ],
};
