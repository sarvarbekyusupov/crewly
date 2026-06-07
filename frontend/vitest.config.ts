import { defineVitestConfig } from '@nuxt/test-utils/config'
import { fileURLToPath } from 'node:url'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    include: ['**/*.{test,spec}.ts'],
    exclude: ['node_modules', '.nuxt', '.output'],
    setupFiles: ['./app/test-setup.ts'],
    dangerouslyIgnoreUnhandledRejections: true,
  },
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./app', import.meta.url)),
    },
  },
})
