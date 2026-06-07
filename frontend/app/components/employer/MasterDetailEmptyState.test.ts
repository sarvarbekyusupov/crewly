import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import MasterDetailEmptyState from './MasterDetailEmptyState.vue'

describe('MasterDetailEmptyState', () => {
  it('renders correctly with title and description', async () => {
    const wrapper = await mountSuspended(MasterDetailEmptyState, {
      props: {
        icon: 'i-heroicons-briefcase',
        title: 'No Job Selected',
        description: 'Select a job to view details.',
      },
    })

    expect(wrapper.text()).toContain('No Job Selected')
    expect(wrapper.text()).toContain('Select a job to view details.')
    const icon = wrapper.findComponent({ name: 'UIcon' })
    expect(icon.exists()).toBe(true)
    expect(icon.props('name')).toBe('i-heroicons-briefcase')
  })
})
