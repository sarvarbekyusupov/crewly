import { vi, describe, it, expect, beforeEach } from 'vitest'

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

// Stub window.location.href safely without replacing window.location entirely
let hrefMock = 'http://localhost/'
if (typeof window !== 'undefined' && window.location) {
  Object.defineProperty(window.location, 'href', {
    get() {
      return hrefMock
    },
    set(v) {
      hrefMock = v
    },
    configurable: true,
  })
}

import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { setActivePinia, createPinia } from 'pinia'
import { useCandidateAuthStore } from './candidate-auth'

const { mockGet, mockPost } = vi.hoisted(() => {
  return {
    mockGet: vi.fn(),
    mockPost: vi.fn(),
  }
})

mockNuxtImport('useCandidateApi', () => {
  return () => ({
    get: mockGet,
    post: mockPost,
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

describe('Candidate Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
    hrefMock = 'http://localhost/'
  })

  it('initializes with default state', () => {
    const store = useCandidateAuthStore()
    expect(store.candidate).toBeNull()
    expect(store.loading).toBe(false)
    expect(store.isAuthenticated).toBe(false)
  })

  describe('fetchMe', () => {
    it('sets candidate on success', async () => {
      const store = useCandidateAuthStore()
      const mockCand = { id: '1', fullName: 'John Doe' }
      mockGet.mockResolvedValueOnce(mockCand)

      await store.fetchMe()

      expect(mockGet).toHaveBeenCalledWith('/api/v1/candidate-auth/me')
      expect(store.candidate).toEqual(mockCand)
      expect(store.loading).toBe(false)
      expect(localStorage.setItem).toHaveBeenCalledWith('cand_hint', '1')
    })

    it('clears candidate on failure', async () => {
      const store = useCandidateAuthStore()
      store.candidate = { id: '1' } as any
      mockGet.mockRejectedValueOnce(new Error('Fetch failed'))

      await store.fetchMe()

      expect(store.candidate).toBeNull()
      expect(store.loading).toBe(false)
      expect(localStorage.removeItem).toHaveBeenCalledWith('cand_hint')
    })
  })

  describe('initiateGoogleLogin', () => {
    it('redirects to Google OAuth URL', () => {
      const store = useCandidateAuthStore()
      store.initiateGoogleLogin()
      expect(hrefMock).toBe('http://localhost:3000/api/v1/candidate-auth/google')
    })
  })

  describe('signup', () => {
    it('sets candidate on success', async () => {
      const store = useCandidateAuthStore()
      const mockCand = { id: '2', fullName: 'Jane Doe' }
      mockPost.mockResolvedValueOnce({ candidate: mockCand })

      await store.signup('jane@example.com', 'password', 'Jane Doe')

      expect(mockPost).toHaveBeenCalledWith('/api/v1/candidate-auth/signup', {
        email: 'jane@example.com',
        password: 'password',
        fullName: 'Jane Doe',
      })
      expect(store.candidate).toEqual(mockCand)
      expect(localStorage.setItem).toHaveBeenCalledWith('cand_hint', '1')
    })
  })

  describe('login', () => {
    it('sets candidate on success', async () => {
      const store = useCandidateAuthStore()
      const mockCand = { id: '3', fullName: 'Bob Builder' }
      mockPost.mockResolvedValueOnce({ candidate: mockCand })

      await store.login('bob@example.com', 'password')

      expect(mockPost).toHaveBeenCalledWith('/api/v1/candidate-auth/login', {
        email: 'bob@example.com',
        password: 'password',
      })
      expect(store.candidate).toEqual(mockCand)
      expect(localStorage.setItem).toHaveBeenCalledWith('cand_hint', '1')
    })
  })

  describe('logout', () => {
    it('calls logout API and clears state', async () => {
      const store = useCandidateAuthStore()
      store.candidate = { id: '3' } as any
      mockPost.mockResolvedValueOnce({})

      await store.logout()

      expect(mockPost).toHaveBeenCalledWith('/api/v1/candidate-auth/logout', {})
      expect(store.candidate).toBeNull()
      expect(localStorage.removeItem).toHaveBeenCalledWith('cand_hint')
    })

    it('clears state even if logout API fails', async () => {
      const store = useCandidateAuthStore()
      store.candidate = { id: '3' } as any
      mockPost.mockRejectedValueOnce(new Error('Network error'))

      await store.logout()

      expect(store.candidate).toBeNull()
      expect(localStorage.removeItem).toHaveBeenCalledWith('cand_hint')
    })
  })

  describe('clearCandidate', () => {
    it('clears state and removes hint', () => {
      const store = useCandidateAuthStore()
      store.candidate = { id: '3' } as any
      store.clearCandidate()
      expect(store.candidate).toBeNull()
      expect(localStorage.removeItem).toHaveBeenCalledWith('cand_hint')
    })
  })
})
