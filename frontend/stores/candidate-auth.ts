import { defineStore } from 'pinia'
import type { Candidate } from '~/types/api'

export const useCandidateAuthStore = defineStore('candidate-auth', () => {
  const candidate = ref<Candidate | null>(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => candidate.value !== null)

  async function fetchMe() {
    const {
      public: { apiBase },
    } = useRuntimeConfig()
    try {
      loading.value = true
      candidate.value = await $fetch<Candidate>('/api/v1/candidate-auth/me', {
        baseURL: apiBase as string,
        credentials: 'include',
      })
    } catch {
      candidate.value = null
    } finally {
      loading.value = false
    }
  }

  function initiateGoogleLogin() {
    const {
      public: { apiBase },
    } = useRuntimeConfig()
    window.location.href = `${apiBase}/api/v1/candidate-auth/google`
  }

  async function signup(email: string, password: string, fullName?: string) {
    const {
      public: { apiBase },
    } = useRuntimeConfig()
    const res = await $fetch<{ candidate: Candidate }>('/api/v1/candidate-auth/signup', {
      method: 'POST',
      baseURL: apiBase as string,
      credentials: 'include',
      body: { email, password, fullName },
    })
    candidate.value = res.candidate
  }

  async function login(email: string, password: string) {
    const {
      public: { apiBase },
    } = useRuntimeConfig()
    const res = await $fetch<{ candidate: Candidate }>('/api/v1/candidate-auth/login', {
      method: 'POST',
      baseURL: apiBase as string,
      credentials: 'include',
      body: { email, password },
    })
    candidate.value = res.candidate
  }

  async function logout() {
    const {
      public: { apiBase },
    } = useRuntimeConfig()
    try {
      await $fetch('/api/v1/candidate-auth/logout', {
        method: 'POST',
        baseURL: apiBase as string,
        credentials: 'include',
      })
    } catch {
      /* ignore — always clear local state */
    } finally {
      candidate.value = null
    }
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
  }
})
