import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createTokenRefresher, buildApiClient } from './useApiBase'

describe('useApiBase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    globalThis.$fetch = vi.fn() as any
  })

  describe('createTokenRefresher', () => {
    it('calls POST on refresh path', async () => {
      const tryRefresh = createTokenRefresher('/api/v1/auth/refresh')
      const mockFetch = vi.mocked($fetch).mockResolvedValueOnce({})

      const result = await tryRefresh('http://localhost')

      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith('/api/v1/auth/refresh', {
        method: 'POST',
        baseURL: 'http://localhost',
        credentials: 'include',
      })
    })

    it('returns false and fails silently if fetch fails', async () => {
      const tryRefresh = createTokenRefresher('/api/v1/auth/refresh')
      vi.mocked($fetch).mockRejectedValueOnce(new Error('Network Error'))

      const result = await tryRefresh('http://localhost')

      expect(result).toBe(false)
    })
  })

  describe('buildApiClient', () => {
    it('performs successful GET requests', async () => {
      const handlers = {
        tryRefresh: vi.fn(),
        onUnauth: vi.fn(),
      }
      const client = buildApiClient('http://localhost', handlers)
      vi.mocked($fetch).mockResolvedValueOnce({ data: 'success' })

      const res = await client.get('/test', { page: 1 })

      expect(res).toEqual({ data: 'success' })
      expect($fetch).toHaveBeenCalledWith('/test', {
        baseURL: 'http://localhost',
        credentials: 'include',
        method: 'GET',
        params: { page: 1 },
      })
    })

    it('performs successful POST requests', async () => {
      const handlers = {
        tryRefresh: vi.fn(),
        onUnauth: vi.fn(),
      }
      const client = buildApiClient('http://localhost', handlers)
      vi.mocked($fetch).mockResolvedValueOnce({ id: 123 })

      const res = await client.post('/test', { name: 'test' })

      expect(res).toEqual({ id: 123 })
      expect($fetch).toHaveBeenCalledWith('/test', {
        baseURL: 'http://localhost',
        credentials: 'include',
        method: 'POST',
        body: { name: 'test' },
      })
    })

    it('tries refresh on 401 and retries request', async () => {
      const handlers = {
        tryRefresh: vi.fn().mockResolvedValueOnce(true),
        onUnauth: vi.fn(),
      }
      const client = buildApiClient('http://localhost', handlers)

      // First call throws 401, second call succeeds
      const mockError = { status: 401 }
      vi.mocked($fetch).mockRejectedValueOnce(mockError).mockResolvedValueOnce({ success: true })

      const res = await client.get('/test')

      expect(res).toEqual({ success: true })
      expect(handlers.tryRefresh).toHaveBeenCalled()
      expect($fetch).toHaveBeenCalledTimes(2)
    })

    it('calls onUnauth if refresh fails on 401', async () => {
      const handlers = {
        tryRefresh: vi.fn().mockResolvedValueOnce(false),
        onUnauth: vi.fn(),
      }
      const client = buildApiClient('http://localhost', handlers)

      const mockError = { status: 401 }
      vi.mocked($fetch).mockRejectedValueOnce(mockError)

      await expect(client.get('/test')).rejects.toThrow()
      expect(handlers.tryRefresh).toHaveBeenCalled()
      expect(handlers.onUnauth).toHaveBeenCalled()
    })
  })
})
