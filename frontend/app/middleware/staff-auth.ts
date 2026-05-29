export default defineNuxtRouteMiddleware(async (to) => {
  if (to.meta.auth === false) return
  const store = useStaffStore()
  if (!store.isAuthenticated) {
    const ok = await store.fetchMe()
    if (!ok) return navigateTo('/staff/login')
  }
})
