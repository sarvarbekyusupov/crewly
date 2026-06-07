import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUIStore } from './ui'

describe('UI Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes with default state', () => {
    const store = useUIStore()
    expect(store.breadcrumbLabel).toBe('')
    expect(store.paletteOpen).toBe(false)
  })

  it('sets and clears breadcrumb label', () => {
    const store = useUIStore()
    store.setBreadcrumbLabel('Dashboard')
    expect(store.breadcrumbLabel).toBe('Dashboard')

    store.clearBreadcrumbLabel()
    expect(store.breadcrumbLabel).toBe('')
  })

  it('opens and closes palette', () => {
    const store = useUIStore()
    expect(store.paletteOpen).toBe(false)

    store.openPalette()
    expect(store.paletteOpen).toBe(true)

    store.closePalette()
    expect(store.paletteOpen).toBe(false)
  })
})
