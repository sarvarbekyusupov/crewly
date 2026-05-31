import { describe, it, expect } from 'vitest'
import {
  jobStatusColor,
  appStatusColor,
  invoiceStatusColor,
  ingestionStatusColor,
  companyStatusColor,
} from './statusColors'

describe('statusColors', () => {
  describe('jobStatusColor', () => {
    it('returns neutral for draft', () => {
      expect(jobStatusColor('draft')).toBe('neutral')
    })
    it('returns success for active', () => {
      expect(jobStatusColor('active')).toBe('success')
    })
    it('returns warning for paused', () => {
      expect(jobStatusColor('paused')).toBe('warning')
    })
    it('returns neutral for unknown status', () => {
      expect(jobStatusColor('unknown_status')).toBe('neutral')
    })
  })

  describe('appStatusColor', () => {
    it('returns info for outreach_sent', () => {
      expect(appStatusColor('outreach_sent')).toBe('info')
    })
    it('returns success for hired', () => {
      expect(appStatusColor('hired')).toBe('success')
    })
    it('returns error for screened_fail', () => {
      expect(appStatusColor('screened_fail')).toBe('error')
    })
    it('returns neutral for unknown status', () => {
      expect(appStatusColor('random_status')).toBe('neutral')
    })
  })

  describe('invoiceStatusColor', () => {
    it('returns success for paid', () => {
      expect(invoiceStatusColor('paid')).toBe('success')
    })
    it('returns error for overdue', () => {
      expect(invoiceStatusColor('overdue')).toBe('error')
    })
    it('returns neutral for cancelled', () => {
      expect(invoiceStatusColor('cancelled')).toBe('neutral')
    })
  })

  describe('ingestionStatusColor', () => {
    it('returns info for running', () => {
      expect(ingestionStatusColor('running')).toBe('info')
    })
    it('returns warning for partial', () => {
      expect(ingestionStatusColor('partial')).toBe('warning')
    })
  })

  describe('companyStatusColor', () => {
    it('returns success for active', () => {
      expect(companyStatusColor('active')).toBe('success')
    })
    it('returns warning for suspended', () => {
      expect(companyStatusColor('suspended')).toBe('warning')
    })
    it('returns neutral for other values', () => {
      expect(companyStatusColor('other')).toBe('neutral')
    })
  })
})
