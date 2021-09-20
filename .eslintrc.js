module.exports = {
  env: {
    node: true,
    mocha: true,
    es2021: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 12,
    extraFileExtensions: ['.json'],
    sourceType: 'module',
    ecmaFeatures: {
      modules: true,
      experimentalObjectRestSpread: true,
    },
  },
  rules: {},
};
