module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    ['@babel/plugin-transform-runtime', { helpers: true }],
    ['module-resolver', {
      root: ['./frontend/src'],
      alias: { '@': './frontend' },
    }],
  ],
};
