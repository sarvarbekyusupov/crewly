import { describe, it, expect } from 'vitest'
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

  it('translates job priority', () => {
    const { jobPriorityLabel } = useStatusLabels()
    expect(jobPriorityLabel('high')).toBe('jobs.priority.high')
    expect(jobPriorityLabel('normal')).toBe('jobs.priority.normal')
    expect(jobPriorityLabel('unknown_prio')).toBe('unknown_prio')
  })

  it('translates invoice status', () => {
    const { invoiceStatusLabel } = useStatusLabels()
    expect(invoiceStatusLabel('paid')).toBe('invoices.status.paid')
    expect(invoiceStatusLabel('unpaid_billing')).toBe('unpaid_billing')
  })

  it('translates role label', () => {
    const { roleLabel } = useStatusLabels()
    expect(roleLabel('admin')).toBe('settings.roles.admin')
    expect(roleLabel('developer')).toBe('developer')
  })

  it('translates conversation state', () => {
    const { conversationStateLabel } = useStatusLabels()
    expect(conversationStateLabel('in_progress')).toBe('conversations.state.inProgress')
    expect(conversationStateLabel('not_started')).toBe('not_started')
  })

  it('translates screening status', () => {
    const { screeningStatusLabel } = useStatusLabels()
    expect(screeningStatusLabel('completed')).toBe('applications.screening.completed')
    expect(screeningStatusLabel('some_random_status')).toBe('some_random_status')
  })
})
