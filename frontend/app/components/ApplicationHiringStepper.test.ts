import { describe, it, expect } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import ApplicationHiringStepper from './ApplicationHiringStepper.vue'

mockNuxtImport('useI18n', () => {
  return () => ({
    t: (key: string) => key,
  })
})

describe('ApplicationHiringStepper', () => {
  it('renders all steps and marks current active', async () => {
    const wrapper = await mountSuspended(ApplicationHiringStepper, {
      props: {
        status: 'delivered',
      },
    })

    expect(wrapper.text()).toContain('applications.stepper.title')

    const activeSteps = wrapper.findAll('.step-active')
    expect(activeSteps).toHaveLength(1)
    expect(activeSteps[0]?.text()).toContain('applications.stepper.delivered')
  })

  it('handles terminal rejected statuses correctly', async () => {
    const wrapper = await mountSuspended(ApplicationHiringStepper, {
      props: {
        status: 'screened_fail',
      },
    })

    const terminalStepper = wrapper.find('.stepper-terminal')
    expect(terminalStepper.exists()).toBe(true)
    expect(wrapper.text()).toContain('applications.stepper.terminal')
  })
})
