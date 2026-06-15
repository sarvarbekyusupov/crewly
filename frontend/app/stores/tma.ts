import { defineStore } from 'pinia'

interface TmaProfile {
  id: string
  fullName?: string | null
  name?: string | null
  email?: string | null
  currentPosition?: string | null
  skills?: string[]
  role?: string
}

export const useTmaStore = defineStore('tma', () => {
  const token = ref<string | null>(null)
  const role = ref<'candidate' | 'hr' | null>(null)
  const profile = ref<TmaProfile | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!token.value)
  const isCandidate = computed(() => role.value === 'candidate')
  const isHr = computed(() => role.value === 'hr')

  const runtimeConfig = useRuntimeConfig()
  const baseURL: string = runtimeConfig.public?.apiBase ?? ''

  async function authenticate(initData: string) {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<{ token: string; role: 'candidate' | 'hr'; profile: TmaProfile }>(
        '/api/v1/tma/auth',
        {
          method: 'POST',
          baseURL,
          body: { initData },
        },
      )
      token.value = res.token
      role.value = res.role
      profile.value = res.profile
    } catch (err: any) {
      error.value = err?.data?.message ?? 'Auth failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function apiGet<T>(path: string, params?: Record<string, any>): Promise<T> {
    return $fetch<T>(path, {
      method: 'GET',
      baseURL,
      params,
      headers: { Authorization: `Bearer ${token.value}` },
    }) as Promise<T>
  }

  async function apiPost<T>(path: string, body?: any): Promise<T> {
    return $fetch<T>(path, {
      method: 'POST',
      baseURL,
      body,
      headers: { Authorization: `Bearer ${token.value}` },
    }) as Promise<T>
  }

  function logout() {
    token.value = null
    role.value = null
    profile.value = null
  }

  return {
    token,
    role,
    profile,
    loading,
    error,
    isAuthenticated,
    isCandidate,
    isHr,
    authenticate,
    apiGet,
    apiPost,
    logout,
  }
})
