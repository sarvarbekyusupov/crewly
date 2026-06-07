import { defineStore } from 'pinia'
import type { Candidate } from '~/types/api'

export const useCandidateAuthStore = defineStore('candidate-auth', () => {
  const candidate = ref<Candidate | null>(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => candidate.value !== null)

  async function fetchMe(): Promise<void> {
    const api = useCandidateApi()
    try {
      loading.value = true
      candidate.value = await api.get<Candidate>('/api/v1/candidate-auth/me')
      if (import.meta.client) localStorage.setItem('cand_hint', '1')
    } catch {
      candidate.value = null
      if (import.meta.client) localStorage.removeItem('cand_hint')
    } finally {
      loading.value = false
    }
  }

  function initiateGoogleLogin(): void {
    const {
      public: { apiBase },
    } = useRuntimeConfig()
    const url = `${apiBase}/api/v1/candidate-auth/google`
    console.log('[GoogleLogin] apiBase:', apiBase)
    console.log('[GoogleLogin] redirecting to:', url)
    window.location.href = url
  }

  async function signup(email: string, password: string, fullName?: string): Promise<void> {
    const api = useCandidateApi()
    const res = await api.post<{ candidate: Candidate }>('/api/v1/candidate-auth/signup', {
      email,
      password,
      fullName,
    })
    candidate.value = res.candidate
    if (import.meta.client) localStorage.setItem('cand_hint', '1')
  }

  async function login(email: string, password: string): Promise<void> {
    candidate.value = null // ensure shouldAttemptRefresh=false — wrong-password 401 must not trigger token refresh
    const api = useCandidateApi()
    const res = await api.post<{ candidate: Candidate }>('/api/v1/candidate-auth/login', {
      email,
      password,
    })
    candidate.value = res.candidate
    if (import.meta.client) localStorage.setItem('cand_hint', '1')
  }

  async function logout(): Promise<void> {
    const api = useCandidateApi()
    try {
      await api.post('/api/v1/candidate-auth/logout', {})
    } catch {
      /* ignore — always clear local state */
    } finally {
      candidate.value = null
      if (import.meta.client) localStorage.removeItem('cand_hint')
    }
  }

  function clearCandidate(): void {
    candidate.value = null
    if (import.meta.client) localStorage.removeItem('cand_hint')
  }

  return {
    candidate,
    loading,
    isAuthenticated,
    fetchMe,
    initiateGoogleLogin,
    signup,
    login,
    logout,
    clearCandidate,
  }
})
