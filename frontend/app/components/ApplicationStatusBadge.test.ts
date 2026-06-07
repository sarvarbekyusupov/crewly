import { describe, it, expect } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import ApplicationStatusBadge from './ApplicationStatusBadge.vue'

mockNuxtImport('useStatusLabels', () => {
  return () => ({
    appStatusLabel: (status: string) => `label.${status}`,
  })
})

mockNuxtImport('appStatusColor', () => {
  return (status: string) => `color.${status}`
})

describe('ApplicationStatusBadge', () => {
  it('renders correctly with label and size', async () => {
    const wrapper = await mountSuspended(ApplicationStatusBadge, {
      props: {
        status: 'hired',
        size: 'sm',
      },
    })

    expect(wrapper.text()).toBe('label.hired')
    const badge = wrapper.findComponent({ name: 'UBadge' })
    expect(badge.exists()).toBe(true)
    expect(badge.props('size')).toBe('sm')
  })
})
