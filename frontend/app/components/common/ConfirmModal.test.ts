import { vi, describe, it, expect } from 'vitest'

import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import ConfirmModal from './ConfirmModal.vue'

// Stub localStorage globally before Nuxt starts
const storageMock: Record<string, string> = {}
globalThis.localStorage = {
  getItem: vi.fn((key: string) => storageMock[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    storageMock[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    Reflect.deleteProperty(storageMock, key)
  }),
  clear: vi.fn(() => {
    for (const key in storageMock) {
      Reflect.deleteProperty(storageMock, key)
    }
  }),
  length: 0,
  key: vi.fn(),
} as any

mockNuxtImport('useI18n', () => {
  return () => ({
    t: (key: string) => key,
  })
})

describe('ConfirmModal', () => {
  it('renders title, slots, and reacts to confirm emit', async () => {
    // Clear document.body before mounting
    document.body.innerHTML = ''

    const wrapper = await mountSuspended(ConfirmModal, {
      props: {
        open: true,
        title: 'Delete Confirmation',
        confirmLabel: 'Confirm Delete',
        confirmColor: 'error',
      },
      slots: {
        default: 'Are you sure you want to delete?',
      },
    })

    // Content is teleported to document.body, so we check document.body.innerHTML
    expect(document.body.innerHTML).toContain('Delete Confirmation')
    expect(document.body.innerHTML).toContain('Are you sure you want to delete?')

    // Find and click the confirm button in the teleported body
    const buttons = Array.from(document.body.querySelectorAll('button'))
    const confirmButton = buttons.find((btn) => btn.textContent?.trim() === 'Confirm Delete')
    expect(confirmButton).toBeDefined()

    // Click the native button
    confirmButton?.click()

    // Verify confirm event was emitted
    expect(wrapper.emitted('confirm')).toBeDefined()
  })
})
