export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path.startsWith('/staff') || to.path.startsWith('/candidate')) return
  if (to.meta.auth === false) return

  const store = useAuthStore()
  if (!store.isAuthenticated) {
    await store.fetchMe()
  }

  if (!store.isAuthenticated) {
    return navigateTo('/login')
  }
})
