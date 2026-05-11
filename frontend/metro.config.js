/**
 * Metro bundler configuration
 * Handles JavaScript bundling for React Native
 */
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const config = {};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
