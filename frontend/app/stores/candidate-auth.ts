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
    } catch {
      candidate.value = null
    } finally {
      loading.value = false
    }
  }

  function initiateGoogleLogin(): void {
    const {
      public: { apiBase },
    } = useRuntimeConfig()
    window.location.href = `${apiBase}/api/v1/candidate-auth/google`
  }

  async function signup(email: string, password: string, fullName?: string): Promise<void> {
    const api = useCandidateApi()
    const res = await api.post<{ candidate: Candidate }>('/api/v1/candidate-auth/signup', {
      email,
      password,
      fullName,
    })
    candidate.value = res.candidate
  }

  async function login(email: string, password: string): Promise<void> {
    candidate.value = null // ensure shouldAttemptRefresh=false — wrong-password 401 must not trigger token refresh
    const api = useCandidateApi()
    const res = await api.post<{ candidate: Candidate }>('/api/v1/candidate-auth/login', {
      email,
      password,
    })
    candidate.value = res.candidate
  }

  async function logout(): Promise<void> {
    const api = useCandidateApi()
    try {
      await api.post('/api/v1/candidate-auth/logout', {})
    } catch {
      /* ignore — always clear local state */
    } finally {
      candidate.value = null
    }
  }

  function clearCandidate(): void {
    candidate.value = null
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
