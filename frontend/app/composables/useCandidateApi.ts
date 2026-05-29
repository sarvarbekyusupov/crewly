import { buildApiClient, createTokenRefresher } from './useApiBase'

const tryRefreshCandidateToken = createTokenRefresher('/api/v1/candidate-auth/refresh')

export function useCandidateApi() {
  const config = useRuntimeConfig()
  const baseURL = config.public.apiBase as string

  return buildApiClient(baseURL, {
    tryRefresh: () => tryRefreshCandidateToken(baseURL),
    onUnauth: async () => {
      useCandidateAuthStore().clearCandidate()
      await navigateTo('/candidate/login')
    },
  })
}
