export default defineNuxtRouteMiddleware(() => {
  if (!import.meta.client) return
  const tmaStore = useTmaStore()
  if (!tmaStore.isAuthenticated) {
    return navigateTo('/tma')
  }
})
