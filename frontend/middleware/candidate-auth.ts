export default defineNuxtRouteMiddleware(async () => {
  const store = useCandidateAuthStore()
  if (!store.isAuthenticated) {
    await store.fetchMe()
  }
  if (!store.isAuthenticated) {
    return navigateTo('/candidate/login')
  }
})
