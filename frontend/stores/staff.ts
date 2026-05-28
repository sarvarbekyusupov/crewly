import { defineStore } from 'pinia'

interface StaffUser {
  id: string
  email: string
  role: string
}

export const useStaffStore = defineStore('staff', () => {
  const staff = ref<StaffUser | null>(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => staff.value !== null)

  async function fetchMe(): Promise<boolean> {
    const api = useApi()
    try {
      loading.value = true
      const res = await api.get<StaffUser>('/api/v1/staff/me')
      staff.value = res
      return true
    } catch {
      staff.value = null
      return false
    } finally {
      loading.value = false
    }
  }

  async function login(email: string, password: string) {
    const api = useApi()
    const res = await api.post<{ staff: StaffUser }>('/api/v1/staff/login', { email, password })
    staff.value = res.staff
  }

  async function logout() {
    const api = useApi()
    try {
      await api.post('/api/v1/staff/logout')
    } finally {
      staff.value = null
    }
  }

  function clear() {
    staff.value = null
  }

  return { staff, loading, isAuthenticated, fetchMe, login, logout, clear }
})
