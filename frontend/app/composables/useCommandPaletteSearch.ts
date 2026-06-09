import { watchDebounced } from '@vueuse/core'

interface NavItem {
  to: string
  label: string
  icon?: string
}

interface NavGroup {
  label: string
  items: NavItem[]
}

export function useCommandPaletteSearch(navGroups: Ref<NavGroup[]>) {
  const api = useApi()
  const router = useRouter()
  const { t } = useI18n()
  const { open: openPalette, close: closePalette } = useCommandPalette()

  const searchTerm = ref('')
  const searchResults = ref<{ jobs: any[]; candidates: any[] }>({ jobs: [], candidates: [] })

  watchDebounced(
    searchTerm,
    async (q) => {
      if (q.length < 2) {
        searchResults.value = { jobs: [], candidates: [] }
        return
      }
      const [jobsRes, candidatesRes] = await Promise.all([
        api.get<any>('/api/v1/jobs', { search: q, limit: 5 }).catch((e: any) => {
          if (e?.statusCode !== 401 && e?.statusCode !== 403)
            console.warn('job search failed', e?.message)
          return { data: [] }
        }),
        api.get<any>('/api/v1/candidates', { search: q, limit: 5 }).catch((e: any) => {
          if (e?.statusCode !== 401 && e?.statusCode !== 403)
            console.warn('candidate search failed', e?.message)
          return { data: [] }
        }),
      ])
      searchResults.value = {
        jobs: jobsRes.data ?? [],
        candidates: candidatesRes.data ?? [],
      }
    },
    { debounce: 250 },
  )

  const commandGroups = computed(() => [
    {
      id: 'nav',
      label: t('nav.commandGroupNav'),
      items: navGroups.value
        .flatMap((g) => g.items)
        .map((item) => ({ id: item.to, label: item.label, icon: item.icon, to: item.to })),
    },
    ...(searchTerm.value.length >= 2
      ? [
          {
            id: 'jobs',
            label: t('nav.commandGroupJobs'),
            items: searchResults.value.jobs.map((j: any) => ({
              id: j.id,
              label: j.title,
              icon: 'i-heroicons-briefcase',
              to: `/jobs/${j.id}`,
              suffix: j.status,
            })),
          },
          {
            id: 'candidates',
            label: t('nav.commandGroupCandidates'),
            items: searchResults.value.candidates.map((c: any) => ({
              id: c.id,
              label: c.fullName,
              icon: 'i-heroicons-user-circle',
              to: `/candidates/${c.id}`,
            })),
          },
        ]
      : []),
  ])

  function onCommandSelect(item: { to: string }) {
    router.push(item.to)
    closePalette()
  }

  const handleKbd = (e: KeyboardEvent) => {
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      openPalette()
    }
  }

  onMounted(() => document.addEventListener('keydown', handleKbd))
  onUnmounted(() => document.removeEventListener('keydown', handleKbd))

  return { searchTerm, commandGroups, onCommandSelect, openPalette, closePalette }
}
