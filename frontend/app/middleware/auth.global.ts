const WAITLIST_ALLOWED = ['/', '/employer', '/candidate', '/terms']

export default defineNuxtRouteMiddleware(async (to) => {
  const { waitlistMode } = useRuntimeConfig().public
  if (waitlistMode && !WAITLIST_ALLOWED.includes(to.path) && !to.path.startsWith('/candidate')) {
    return navigateTo('/')
  }

  // Guest routes: public pages that should redirect already-authenticated users to their dashboard
  if (to.meta.auth === 'guest') {
    if (to.path.startsWith('/staff')) {
      const store = useStaffStore()
      const hasHint = import.meta.client && !!localStorage.getItem('staff_hint')
      if (!store.isAuthenticated && hasHint) await store.fetchMe()
      if (store.isAuthenticated) return navigateTo('/staff/dashboard')
    } else if (to.path === '/' || to.path.startsWith('/candidate')) {
      const store = useCandidateAuthStore()
      const hasHint = import.meta.client && !!localStorage.getItem('cand_hint')
      if (!store.isAuthenticated && hasHint) await store.fetchMe()
      if (store.isAuthenticated) return navigateTo('/candidate/dashboard')
    } else {
      const store = useAuthStore()
      const hasHint = import.meta.client && !!localStorage.getItem('emp_hint')
      if (!store.isAuthenticated && hasHint) await store.fetchMe()
      if (store.isAuthenticated) return navigateTo('/employer/dashboard')
    }
    return
  }

  // Fully public routes — no auth checks at all
  if (to.meta.auth === false) return

  // 1. Staff/Admin Routes
  if (to.path.startsWith('/staff')) {
    const store = useStaffStore()
    if (!store.isAuthenticated) {
      const hasHint = import.meta.client && !!localStorage.getItem('staff_hint')
      if (hasHint) {
        const ok = await store.fetchMe()
        if (!ok) return navigateTo('/staff/login')
      } else {
        return navigateTo('/staff/login')
      }
    }
    return
  }

  // 2. Candidate Routes
  if (to.path.startsWith('/candidate')) {
    const store = useCandidateAuthStore()
    if (!store.isAuthenticated) {
      const hasHint = import.meta.client && !!localStorage.getItem('cand_hint')
      const isOAuthRedirect =
        import.meta.client &&
        to.query.oauth === '1' &&
        (to.path === '/candidate/onboarding' || to.path === '/candidate/dashboard')
      if (hasHint || isOAuthRedirect) await store.fetchMe()
      if (!store.isAuthenticated) {
        if (import.meta.client && window.Telegram?.WebApp?.initData) {
          return navigateTo(`/tma?to=${encodeURIComponent(to.fullPath)}`)
        }
        return navigateTo('/candidate/login')
      }
    }
    return
  }

  // 3. HR / Employer / Corporate Routes (All other routes default to employer check)
  const store = useAuthStore()
  if (!store.isAuthenticated) {
    const hasHint = import.meta.client && !!localStorage.getItem('emp_hint')
    if (hasHint) await store.fetchMe()
    if (!store.isAuthenticated) return navigateTo('/employer/login')
  }
})
