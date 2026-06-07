import { vi } from 'vitest'

// Mock Schema.org / Unhead helpers during Vitest execution
vi.stubGlobal('useSchemaOrg', () => {})
vi.stubGlobal('defineJobPosting', (payload: any) => payload)

// Swallow specific unhandled rejections from third-party library @unhead/schema-org in tests
if (typeof process !== 'undefined') {
  process.on('unhandledRejection', (reason) => {
    const msg = reason instanceof Error ? reason.message : String(reason)
    if (msg.includes('potentialAction') || msg.includes('Cannot read properties of undefined')) {
      // Ignore known third-party library noise in test env
      return
    }
    // Let other actual unhandled rejections bubble up
    console.error('Unhandled Rejection in Test:', reason)
  })
}
