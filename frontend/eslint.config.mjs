// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'

export default withNuxt(eslintPluginPrettierRecommended, {
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    'vue/multi-word-component-names': 'off',
    'vue/no-multiple-template-root': 'off',
    'no-empty': ['error', { allowEmptyCatch: true }],
    'prettier/prettier': ['error', { endOfLine: 'auto' }],
  },
})
