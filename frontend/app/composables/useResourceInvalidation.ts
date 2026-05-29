export function useResourceInvalidation() {
  const invalidateNavCounts = () => refreshNuxtData('nav-counts')

  const invalidateJobs = () => refreshNuxtData(['jobs-list', 'nav-counts'])

  const invalidateApplications = () =>
    refreshNuxtData(['applications-list', 'dashboard-apps', 'dashboard-stats', 'nav-counts'])

  const invalidateConversations = () => refreshNuxtData(['conversations', 'nav-counts'])

  return { invalidateNavCounts, invalidateJobs, invalidateApplications, invalidateConversations }
}
