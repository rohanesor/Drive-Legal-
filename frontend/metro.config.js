/**
 * Metro bundler configuration
 * Handles JavaScript bundling for React Native
 */
const { getDefaultConfig } = require('@expo/metro-config');

const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

const {
  resolver: { sourceExts, assetExts },
} = config;

config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

config.resolver.assetExts = assetExts.filter(ext => ext !== 'svg');
config.resolver.sourceExts = [...sourceExts, 'svg', 'ts', 'tsx'];

module.exports = config;