import { vi, describe, it, expect } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useCommandPalette } from './useCommandPalette'

const { mockUIStore } = vi.hoisted(() => {
  return {
    mockUIStore: {
      openPalette: vi.fn(),
      closePalette: vi.fn(),
    },
  }
})

mockNuxtImport('useUIStore', () => {
  return () => mockUIStore
})

describe('useCommandPalette', () => {
  it('maps uiStore open and close methods', () => {
    const { open, close } = useCommandPalette()

    open()
    expect(mockUIStore.openPalette).toHaveBeenCalled()

    close()
    expect(mockUIStore.closePalette).toHaveBeenCalled()
  })
})
