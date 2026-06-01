import { vi, describe, it, expect, beforeEach } from 'vitest'

import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from './auth'

// Stub localStorage globally before Nuxt starts
const storageMock: Record<string, string> = {}
globalThis.localStorage = {
  getItem: vi.fn((key: string) => storageMock[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    storageMock[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete storageMock[key]
  }),
  clear: vi.fn(() => {
    for (const key in storageMock) {
      delete storageMock[key]
    }
  }),
  length: 0,
  key: vi.fn(),
} as any

const { mockGet, mockPost } = vi.hoisted(() => {
  return {
    mockGet: vi.fn(),
    mockPost: vi.fn(),
  }
})

mockNuxtImport('useApi', () => {
  return () => ({
    get: mockGet,
    post: mockPost,
  })
})

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('initializes with default state', () => {
    const store = useAuthStore()
    expect(store.user).toBeNull()
    expect(store.loading).toBe(false)
    expect(store.isAuthenticated).toBe(false)
    expect(store.role).toBeNull()
  })

  describe('computed properties', () => {
    it('role returns user role', () => {
      const store = useAuthStore()
      store.user = { id: '1', email: 'test@example.com', role: 'admin' } as any
      expect(store.role).toBe('admin')
      expect(store.isAuthenticated).toBe(true)
    })
  })

  describe('can role check', () => {
    it('allows higher or equal role', () => {
      const store = useAuthStore()
      store.user = { id: '1', role: 'admin' } as any

      expect(store.can('admin')).toBe(true)
      expect(store.can('hiring_manager')).toBe(true)
      expect(store.can('owner')).toBe(false)
    })

    it('returns false for unknown/empty role', () => {
      const store = useAuthStore()
      expect(store.can('viewer')).toBe(false)
    })
  })

  describe('fetchMe', () => {
    it('sets user on success', async () => {
      const store = useAuthStore()
      const mockUser = { id: '123', email: 'me@example.com', role: 'viewer' }
      mockGet.mockResolvedValueOnce(mockUser)

      await store.fetchMe()

      expect(mockGet).toHaveBeenCalledWith('/api/v1/auth/me')
      expect(store.user).toEqual(mockUser)
      expect(store.loading).toBe(false)
      expect(localStorage.setItem).toHaveBeenCalledWith('emp_hint', '1')
    })

    it('clears user on failure', async () => {
      const store = useAuthStore()
      store.user = { id: '123' } as any
      mockGet.mockRejectedValueOnce(new Error('Auth failed'))

      await store.fetchMe()

      expect(store.user).toBeNull()
      expect(store.loading).toBe(false)
      expect(localStorage.removeItem).toHaveBeenCalledWith('emp_hint')
    })
  })

  describe('login', () => {
    it('sets user on success', async () => {
      const store = useAuthStore()
      const mockUser = { id: '123', email: 'me@example.com', role: 'viewer' }
      mockPost.mockResolvedValueOnce({ user: mockUser })

      await store.login('me@example.com', 'password')

      expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/login', {
        email: 'me@example.com',
        password: 'password',
      })
      expect(store.user).toEqual(mockUser)
      expect(localStorage.setItem).toHaveBeenCalledWith('emp_hint', '1')
    })
  })

  describe('logout', () => {
    it('calls logout API and clears user', async () => {
      const store = useAuthStore()
      store.user = { id: '123' } as any
      mockPost.mockResolvedValueOnce({})

      await store.logout()

      expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/logout')
      expect(store.user).toBeNull()
      expect(localStorage.removeItem).toHaveBeenCalledWith('emp_hint')
    })
  })

  describe('clearUser', () => {
    it('clears user state', () => {
      const store = useAuthStore()
      store.user = { id: '123' } as any
      store.clearUser()
      expect(store.user).toBeNull()
      expect(localStorage.removeItem).toHaveBeenCalledWith('emp_hint')
    })
  })
})
