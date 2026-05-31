import { vi, describe, it, expect, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useApi } from './useApi'

const { mockClearUser, mockAuthenticated } = vi.hoisted(() => {
  return {
    mockClearUser: vi.fn(),
    mockAuthenticated: { value: true },
  }
})

mockNuxtImport('useAuthStore', () => {
  return () => ({
    clearUser: mockClearUser,
    isAuthenticated: mockAuthenticated.value,
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

describe('useApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    globalThis.$fetch = vi.fn() as any
  })

  it('creates an api client pointing to config apiBase', async () => {
    const client = useApi()
    vi.mocked($fetch).mockResolvedValueOnce({ ok: true })

    await client.get('/me')

    expect($fetch).toHaveBeenCalledWith('/me', expect.objectContaining({
      baseURL: 'http://localhost:3000',
    }))
  })
})
