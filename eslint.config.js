import eslintPluginAstro from 'eslint-plugin-astro';

export default [
  ...eslintPluginAstro.configs['flat/recommended'],
  {
    ignores: ['dist/**', '.astro/**', 'node_modules/**'],
  },
];
