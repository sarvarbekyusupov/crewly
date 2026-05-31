import { vi, describe, it, expect, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useResourceInvalidation } from './useResourceInvalidation'

const { mockRefreshNuxtData } = vi.hoisted(() => {
  return {
    mockRefreshNuxtData: vi.fn(),
  }
})

mockNuxtImport('refreshNuxtData', () => {
  return mockRefreshNuxtData
})

describe('useResourceInvalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('invalidates nav counts', () => {
    const { invalidateNavCounts } = useResourceInvalidation()
    invalidateNavCounts()
    expect(mockRefreshNuxtData).toHaveBeenCalledWith('nav-counts')
  })

  it('invalidates jobs', () => {
    const { invalidateJobs } = useResourceInvalidation()
    invalidateJobs()
    expect(mockRefreshNuxtData).toHaveBeenCalledWith(['jobs-list', 'nav-counts'])
  })

  it('invalidates applications', () => {
    const { invalidateApplications } = useResourceInvalidation()
    invalidateApplications()
    expect(mockRefreshNuxtData).toHaveBeenCalledWith([
      'applications-list',
      'dashboard-apps',
      'dashboard-stats',
      'nav-counts',
    ])
  })

  it('invalidates conversations', () => {
    const { invalidateConversations } = useResourceInvalidation()
    invalidateConversations()
    expect(mockRefreshNuxtData).toHaveBeenCalledWith(['conversations', 'nav-counts'])
  })
})
