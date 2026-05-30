import { buildApiClient, createTokenRefresher } from './useApiBase'

const tryRefreshStaffToken = createTokenRefresher('/api/v1/staff/refresh')

export function useStaffApi() {
  const config = useRuntimeConfig()
  const baseURL = config.public.apiBase as string
  const toast = useToast()
  const { t } = useI18n()

  return buildApiClient(baseURL, {
    tryRefresh: () => tryRefreshStaffToken(baseURL),
    shouldAttemptRefresh: () => useStaffStore().isAuthenticated,
    onUnauth: async () => {
      const staff = useStaffStore()
      staff.clear()
    },
    onForbidden: () => {
      toast.add({ title: t('common.error'), description: t('common.accessDenied'), color: 'error' })
    },
    onError: (msg) => {
      toast.add({ title: t('common.error'), description: msg, color: 'error' })
    },
  })
}
