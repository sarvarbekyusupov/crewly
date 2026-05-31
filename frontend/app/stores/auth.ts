import { defineStore } from 'pinia'
import type { User } from '~/types/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => user.value !== null)
  const role = computed(() => user.value?.role ?? null)

  function can(minRole: 'owner' | 'admin' | 'hiring_manager' | 'viewer'): boolean {
    const hierarchy: Record<string, number> = {
      owner: 4,
      admin: 3,
      hiring_manager: 2,
      viewer: 1,
    }
    return (hierarchy[role.value ?? ''] ?? 0) >= (hierarchy[minRole] ?? 0)
  }

  async function fetchMe(): Promise<void> {
    const api = useApi()
    try {
      loading.value = true
      const me = await api.get<User>('/api/v1/auth/me')
      user.value = me
      if (import.meta.client) localStorage.setItem('emp_hint', '1')
    } catch {
      user.value = null
      if (import.meta.client) localStorage.removeItem('emp_hint')
    } finally {
      loading.value = false
    }
  }

  async function login(email: string, password: string): Promise<void> {
    user.value = null // ensure shouldAttemptRefresh=false — wrong-password 401 must not trigger token refresh
    const api = useApi()
    const res = await api.post<{ user: User }>('/api/v1/auth/login', { email, password })
    user.value = res.user
    if (import.meta.client) localStorage.setItem('emp_hint', '1')
  }

  async function logout(): Promise<void> {
    const api = useApi()
    try {
      await api.post('/api/v1/auth/logout')
    } finally {
      user.value = null
      if (import.meta.client) localStorage.removeItem('emp_hint')
    }
  }

  function clearUser(): void {
    user.value = null
    if (import.meta.client) localStorage.removeItem('emp_hint')
  }

  return { user, loading, isAuthenticated, role, can, fetchMe, login, logout, clearUser }
})
