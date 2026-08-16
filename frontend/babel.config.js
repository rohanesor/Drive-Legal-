module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    ['@babel/plugin-transform-runtime', { helpers: true }],
    // Path alias `@/*` -> `src/*`. Kept in sync with tsconfig.json `paths`.
    ['module-resolver', { root: ['./src'], alias: { '@': './' } }],
  ],
};
