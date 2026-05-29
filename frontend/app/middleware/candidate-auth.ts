export default defineNuxtRouteMiddleware(async (to) => {
  if (to.meta.auth === false) return
  const store = useCandidateAuthStore()
  if (!store.isAuthenticated) {
    await store.fetchMe()
  }
  if (!store.isAuthenticated) {
    return navigateTo('/candidate/login')
  }
})
