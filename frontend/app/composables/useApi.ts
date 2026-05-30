import { buildApiClient, createTokenRefresher } from './useApiBase'
import type { FetchLikeError } from '~/types/api-error'

const tryRefreshHrToken = createTokenRefresher('/api/v1/auth/refresh')

export function useApi() {
  const config = useRuntimeConfig()
  const baseURL = config.public.apiBase as string
  const toast = useToast()
  const { t } = useI18n()

  return buildApiClient(baseURL, {
    tryRefresh: () => tryRefreshHrToken(baseURL),
    shouldAttemptRefresh: () => useAuthStore().isAuthenticated,
    onUnauth: async () => {
      const auth = useAuthStore()
      auth.clearUser()
    },
    onForbidden: () => {
      toast.add({ title: t('common.error'), description: t('common.accessDenied'), color: 'error' })
    },
    onError: (msg) => {
      toast.add({ title: t('common.error'), description: msg, color: 'error' })
    },
  })
}

export type { FetchLikeError }
