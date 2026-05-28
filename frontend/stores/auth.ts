import { defineStore } from 'pinia'
import type { User } from '~/types/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => user.value !== null)
  const role = computed(() => user.value?.role ?? null)

  function can(minRole: 'owner' | 'admin' | 'hiring_manager' | 'viewer') {
    const hierarchy: Record<string, number> = {
      owner: 4,
      admin: 3,
      hiring_manager: 2,
      viewer: 1,
    }
    return (hierarchy[role.value ?? ''] ?? 0) >= (hierarchy[minRole] ?? 0)
  }

  async function fetchMe() {
    const api = useApi()
    try {
      loading.value = true
      const me = await api.get<User>('/api/v1/auth/me')
      user.value = me
    } catch {
      user.value = null
    } finally {
      loading.value = false
    }
  }

  async function login(email: string, password: string) {
    const api = useApi()
    const res = await api.post<{ user: User }>('/api/v1/auth/login', { email, password })
    user.value = res.user
  }

  async function logout() {
    const api = useApi()
    try {
      await api.post('/api/v1/auth/logout')
    } finally {
      user.value = null
    }
  }

  return { user, loading, isAuthenticated, role, can, fetchMe, login, logout }
})
