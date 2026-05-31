import { vi, describe, it, expect } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useBreadcrumb } from './useBreadcrumb'

const { mockUIStore } = vi.hoisted(() => {
  return {
    mockUIStore: {
      breadcrumbLabel: 'Old Label',
      setBreadcrumbLabel: vi.fn(),
      clearBreadcrumbLabel: vi.fn(),
    },
  }
})

mockNuxtImport('useUIStore', () => {
  return () => mockUIStore
})

describe('useBreadcrumb', () => {
  it('maps uiStore state and methods', () => {
    const { breadcrumbLabel, setBreadcrumbLabel, clearBreadcrumbLabel } = useBreadcrumb()

    expect(breadcrumbLabel.value).toBe('Old Label')

    setBreadcrumbLabel('New Label')
    expect(mockUIStore.setBreadcrumbLabel).toHaveBeenCalledWith('New Label')

    clearBreadcrumbLabel()
    expect(mockUIStore.clearBreadcrumbLabel).toHaveBeenCalled()
  })
})
