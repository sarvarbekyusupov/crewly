import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import BulkActionBar from './BulkActionBar.vue'

mockNuxtImport('useI18n', () => {
  return () => ({
    t: (key: string, args?: any) => {
      if (args && args.count !== undefined) {
        return `${key}:${args.count}`
      }
      return key
    },
  })
})

describe('BulkActionBar', () => {
  it('renders actions and triggers events when count > 0', async () => {
    const wrapper = await mountSuspended(BulkActionBar, {
      props: {
        count: 5,
        loading: false,
      },
    })

    expect(wrapper.text()).toContain('applications.bulkSelected:5')

    const buttons = wrapper.findAllComponents({ name: 'UButton' })
    const approveBtn = buttons.find((btn) => btn.text().includes('applications.approve'))
    const rejectBtn = buttons.find((btn) => btn.text().includes('applications.reject'))

    expect(approveBtn).toBeDefined()
    expect(rejectBtn).toBeDefined()

    await approveBtn?.trigger('click')
    expect(wrapper.emitted('approve')).toBeDefined()

    await rejectBtn?.trigger('click')
    expect(wrapper.emitted('reject')).toBeDefined()
  })

  it('renders nothing when count is 0', async () => {
    const wrapper = await mountSuspended(BulkActionBar, {
      props: {
        count: 0,
      },
    })

    expect(wrapper.find('[role="toolbar"]').exists()).toBe(false)
  })
})
