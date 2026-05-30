export default defineNuxtRouteMiddleware(async (to) => {
  // If the route explicitly opts out of authentication, skip the check
  if (to.meta.auth === false) return

  // 1. Staff/Admin Routes
  if (to.path.startsWith('/staff')) {
    const store = useStaffStore()
    if (!store.isAuthenticated) {
      const ok = await store.fetchMe()
      if (!ok) return navigateTo('/staff/login')
    }
    return
  }

  // 2. Candidate Routes
  if (to.path.startsWith('/candidate')) {
    const store = useCandidateAuthStore()
    if (!store.isAuthenticated) {
      await store.fetchMe()
    }
    if (!store.isAuthenticated) {
      return navigateTo('/candidate/login')
    }
    return
  }

  // 3. HR / Employer / Corporate Routes (All other routes)
  const store = useAuthStore()
  if (!store.isAuthenticated) {
    await store.fetchMe()
  }
  if (!store.isAuthenticated) {
    return navigateTo('/login')
  }
})
