import { vi, describe, it, expect } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useStatusLabels } from './useStatusLabels'

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

describe('useStatusLabels', () => {
  it('translates app status', () => {
    const { appStatusLabel } = useStatusLabels()
    expect(appStatusLabel('hired')).toBe('status.hired')
    expect(appStatusLabel('unknown')).toBe('unknown')
  })

  it('translates job status', () => {
    const { jobStatusLabel } = useStatusLabels()
    expect(jobStatusLabel('active')).toBe('jobs.status.active')
    expect(jobStatusLabel('random')).toBe('random')
  })

  it('translates role label', () => {
    const { roleLabel } = useStatusLabels()
    expect(roleLabel('admin')).toBe('settings.roles.admin')
  })
})
