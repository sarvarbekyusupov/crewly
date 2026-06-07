import { vi, describe, it, expect, beforeEach } from 'vitest'

import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { setActivePinia, createPinia } from 'pinia'
import { useStaffStore } from './staff'

// Stub localStorage globally before Nuxt starts
const storageMock: Record<string, string> = {}
globalThis.localStorage = {
  getItem: vi.fn((key: string) => storageMock[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    storageMock[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    Reflect.deleteProperty(storageMock, key)
  }),
  clear: vi.fn(() => {
    for (const key in storageMock) {
      Reflect.deleteProperty(storageMock, key)
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

mockNuxtImport('useStaffApi', () => {
  return () => ({
    get: mockGet,
    post: mockPost,
  })
})

describe('Staff Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('initializes with default state', () => {
    const store = useStaffStore()
    expect(store.staff).toBeNull()
    expect(store.loading).toBe(false)
    expect(store.isAuthenticated).toBe(false)
  })

  describe('fetchMe', () => {
    it('sets staff on success', async () => {
      const store = useStaffStore()
      const mockUser = { id: '1', email: 'staff@example.com' }
      mockGet.mockResolvedValueOnce(mockUser)

      const result = await store.fetchMe()

      expect(result).toBe(true)
      expect(mockGet).toHaveBeenCalledWith('/api/v1/staff/me')
      expect(store.staff).toEqual(mockUser)
      expect(store.loading).toBe(false)
      expect(localStorage.setItem).toHaveBeenCalledWith('staff_hint', '1')
    })

    it('clears staff on failure', async () => {
      const store = useStaffStore()
      store.staff = { id: '1' } as any
      mockGet.mockRejectedValueOnce(new Error('Unauthenticated'))

      const result = await store.fetchMe()

      expect(result).toBe(false)
      expect(store.staff).toBeNull()
      expect(store.loading).toBe(false)
      expect(localStorage.removeItem).toHaveBeenCalledWith('staff_hint')
    })
  })

  describe('login', () => {
    it('sets staff on success', async () => {
      const store = useStaffStore()
      const mockUser = { id: '2', email: 'staff2@example.com' }
      mockPost.mockResolvedValueOnce({ staff: mockUser })

      await store.login('staff2@example.com', 'password')

      expect(mockPost).toHaveBeenCalledWith('/api/v1/staff/login', {
        email: 'staff2@example.com',
        password: 'password',
      })
      expect(store.staff).toEqual(mockUser)
      expect(localStorage.setItem).toHaveBeenCalledWith('staff_hint', '1')
    })
  })

  describe('logout', () => {
    it('calls logout API and clears state', async () => {
      const store = useStaffStore()
      store.staff = { id: '2' } as any
      mockPost.mockResolvedValueOnce({})

      await store.logout()

      expect(mockPost).toHaveBeenCalledWith('/api/v1/staff/logout')
      expect(store.staff).toBeNull()
      expect(localStorage.removeItem).toHaveBeenCalledWith('staff_hint')
    })
  })

  describe('logoutAll', () => {
    it('calls logout-all API and clears state', async () => {
      const store = useStaffStore()
      store.staff = { id: '2' } as any
      mockPost.mockResolvedValueOnce({})

      await store.logoutAll()

      expect(mockPost).toHaveBeenCalledWith('/api/v1/staff/logout-all')
      expect(store.staff).toBeNull()
      expect(localStorage.removeItem).toHaveBeenCalledWith('staff_hint')
    })
  })

  describe('clear', () => {
    it('clears state and hint', () => {
      const store = useStaffStore()
      store.staff = { id: '2' } as any
      store.clear()
      expect(store.staff).toBeNull()
      expect(localStorage.removeItem).toHaveBeenCalledWith('staff_hint')
    })
  })
})
