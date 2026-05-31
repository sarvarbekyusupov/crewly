import { buildApiClient, createTokenRefresher } from './useApiBase'

const tryRefreshStaffToken = createTokenRefresher('/api/v1/staff/refresh')

export function useStaffApi() {
  const config = useRuntimeConfig()
  const baseURL = config.public.apiBase as string

  return buildApiClient(baseURL, {
    tryRefresh: () => tryRefreshStaffToken(baseURL),
    shouldAttemptRefresh: () => useStaffStore().isAuthenticated,
    onUnauth: async () => {
      useStaffStore().clear()
    },
    onForbidden: () => {
      const { t } = useI18n()
      useToast().add({ title: t('common.error'), description: t('common.accessDenied'), color: 'error' })
    },
    onError: (msg) => {
      const { t } = useI18n()
      useToast().add({ title: t('common.error'), description: msg, color: 'error' })
    },
  })
}
