import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ref, watch } from 'vue'

vi.mock('@vueuse/core', () => ({
  watchDebounced: (src: any, cb: any, options: any) => {
    watch(src, cb, { ...options, flush: 'sync' })
  },
}))

import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { setActivePinia, createPinia } from 'pinia'
import { useCommandPaletteSearch } from './useCommandPaletteSearch'

const { mockApi, mockPush, mockOpen, mockClose } = vi.hoisted(() => {
  return {
    mockApi: {
      get: vi.fn(),
    },
    mockPush: vi.fn(),
    mockOpen: vi.fn(),
    mockClose: vi.fn(),
  }
})

mockNuxtImport('useApi', () => {
  return () => mockApi
})

mockNuxtImport('useRouter', (original) => {
  return () => {
    const originalRouter = original()
    return {
      ...originalRouter,
      push: mockPush,
    }
  }
})

mockNuxtImport('useI18n', () => {
  return () => ({
    t: (key: string) => key,
  })
})

mockNuxtImport('useCommandPalette', () => {
  return () => ({
    open: mockOpen,
    close: mockClose,
  })
})

describe('useCommandPaletteSearch', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initializes with default search term', () => {
    const navGroups = ref([
      { label: 'Group', items: [{ to: '/dashboard', label: 'Dashboard', icon: 'home' }] },
    ])
    const { searchTerm, commandGroups } = useCommandPaletteSearch(navGroups)

    expect(searchTerm.value).toBe('')
    expect(commandGroups.value?.[0]?.items).toEqual([
      { id: '/dashboard', label: 'Dashboard', icon: 'home', to: '/dashboard' },
    ])
  })

  it('triggers API call on search term update', async () => {
    const navGroups = ref([])
    const { searchTerm } = useCommandPaletteSearch(navGroups)

    mockApi.get.mockResolvedValueOnce({ data: [{ id: 'job-1', title: 'Developer', status: 'active' }] })
    mockApi.get.mockResolvedValueOnce({ data: [{ id: 'cand-1', fullName: 'Candidate A' }] })

    searchTerm.value = 'Developer'

    expect(mockApi.get).toHaveBeenCalledWith('/api/v1/jobs', { search: 'Developer', limit: 5 })
    expect(mockApi.get).toHaveBeenCalledWith('/api/v1/candidates', { search: 'Developer', limit: 5 })
  })

  it('closes palette and pushes to route onCommandSelect', () => {
    const navGroups = ref([])
    const { onCommandSelect } = useCommandPaletteSearch(navGroups)

    onCommandSelect({ to: '/jobs/1' })

    expect(mockPush).toHaveBeenCalledWith('/jobs/1')
    expect(mockClose).toHaveBeenCalled()
  })
})
