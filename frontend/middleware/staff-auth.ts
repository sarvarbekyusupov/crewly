export default defineNuxtRouteMiddleware(async () => {
  const store = useStaffStore()
  if (!store.isAuthenticated) {
    const ok = await store.fetchMe()
    if (!ok) return navigateTo('/staff/login')
  }
})
