import { extractApiErrorMessage } from '~/utils/formatters'
import { getFetchStatus } from '~/types/api-error'

export function createTokenRefresher(refreshPath: string) {
  let isRefreshing = false
  let refreshPromise: Promise<void> | null = null

  return async function tryRefresh(baseURL: string): Promise<boolean> {
    if (isRefreshing) {
      try {
        await refreshPromise
        return true
      } catch {
        return false
      }
    }
    isRefreshing = true
    refreshPromise = $fetch(refreshPath, { method: 'POST', baseURL, credentials: 'include' })
      .then(() => {})
      .catch(() => {
        throw new Error('refresh_failed')
      })
    try {
      await refreshPromise
      return true
    } catch {
      return false
    } finally {
      isRefreshing = false
      refreshPromise = null
    }
  }
}

export interface ApiClientHandlers {
  tryRefresh: () => Promise<boolean>
  shouldAttemptRefresh?: () => boolean
  onUnauth: () => void | Promise<void>
  onForbidden?: () => void
  onError?: (msg: string) => void
}

export function buildApiClient(baseURL: string, handlers: ApiClientHandlers) {
  async function request<T>(
    path: string,
    options: Parameters<typeof $fetch>[1] & { _retry?: boolean } = {},
  ): Promise<T> {
    try {
      return await $fetch<T>(path, { baseURL, credentials: 'include', ...options })
    } catch (err: unknown) {
      const status = getFetchStatus(err)
      if (status === 401) {
        const canRefresh = handlers.shouldAttemptRefresh?.() ?? true
        if (canRefresh && !options._retry) {
          const refreshed = await handlers.tryRefresh()
          if (refreshed) return request<T>(path, { ...options, _retry: true })
        }
        await handlers.onUnauth()
      } else if (status === 403) {
        handlers.onForbidden?.()
      } else {
        handlers.onError?.(extractApiErrorMessage(err))
      }
      throw err
    }
  }

  return {
    get: <T>(path: string, params?: Record<string, any>) =>
      request<T>(path, { method: 'GET', params }),

    post: <T>(path: string, body?: any) => request<T>(path, { method: 'POST', body }),

    patch: <T>(path: string, body?: any) => request<T>(path, { method: 'PATCH', body }),

    del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  }
}
