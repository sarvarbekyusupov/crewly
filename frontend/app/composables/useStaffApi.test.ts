import { vi, describe, it, expect, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useStaffApi } from './useStaffApi'

const { mockClear } = vi.hoisted(() => {
  return {
    mockClear: vi.fn(),
  }
})

mockNuxtImport('useStaffStore', () => {
  return () => ({
    clear: mockClear,
    isAuthenticated: true,
  })
})

mockNuxtImport('useRuntimeConfig', (original) => {
  return () => {
    const originalConfig = original()
    return {
      ...originalConfig,
      public: {
        ...originalConfig.public,
        apiBase: 'http://localhost:3000',
      },
    }
  }
})

describe('useStaffApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    globalThis.$fetch = vi.fn() as any
  })

  it('creates a staff api client pointing to config apiBase', async () => {
    const client = useStaffApi()
    vi.mocked($fetch).mockResolvedValueOnce({ ok: true })

    await client.get('/staff-profile')

    expect($fetch).toHaveBeenCalledWith(
      '/staff-profile',
      expect.objectContaining({
        baseURL: 'http://localhost:3000',
      }),
    )
  })
})
