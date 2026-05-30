export default defineNuxtPlugin(() => {
  // 1. Watch Employer/HR Auth Store
  const authStore = useAuthStore()
  watch(
    () => authStore.isAuthenticated,
    (isAuth, old) => {
      // Only redirect if transitioning from authenticated (true) to unauthenticated (false)
      if (old && !isAuth) {
        navigateTo('/employer/login')
      }
    },
  )

  // 2. Watch Candidate Auth Store
  const candidateAuthStore = useCandidateAuthStore()
  watch(
    () => candidateAuthStore.isAuthenticated,
    (isAuth, old) => {
      if (old && !isAuth) {
        navigateTo('/candidate/login')
      }
    },
  )

  // 3. Watch Staff/Admin Auth Store
  const staffStore = useStaffStore()
  watch(
    () => staffStore.isAuthenticated,
    (isAuth, old) => {
      if (old && !isAuth) {
        navigateTo('/staff/login')
      }
    },
  )
})
