import { describe, expect, it, vi } from 'vitest'
import {
  extractApiErrorMessage,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatSalary,
  applyApiFieldErrors,
} from './formatters'

describe('formatDate', () => {
  it('returns em-dash if no date string is provided', () => {
    expect(formatDate()).toBe('—')
    expect(formatDate('')).toBe('—')
  })

  it('formats a date string correctly', () => {
    const d = '2026-06-04T00:00:00.000Z'
    expect(formatDate(d)).toBe(new Date(d).toLocaleDateString())
  })
})

describe('formatDateTime', () => {
  it('returns em-dash if no date string is provided', () => {
    expect(formatDateTime()).toBe('—')
    expect(formatDateTime('')).toBe('—')
  })

  it('formats a datetime string correctly', () => {
    const d = '2026-06-04T12:30:00.000Z'
    expect(formatDateTime(d)).toBe(new Date(d).toLocaleString())
  })
})

describe('formatRelativeTime', () => {
  it('handles "just now"', () => {
    const now = new Date().toISOString()
    expect(formatRelativeTime(now)).toBe('just now')
  })

  it('handles minutes ago', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    expect(formatRelativeTime(fiveMinutesAgo)).toBe('5m ago')
  })

  it('handles hours ago', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    expect(formatRelativeTime(threeHoursAgo)).toBe('3h ago')
  })

  it('handles days ago', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    expect(formatRelativeTime(twoDaysAgo)).toBe('2d ago')
  })
})

describe('formatSalary', () => {
  it('returns em-dash if no salary is provided', () => {
    expect(formatSalary()).toBe('—')
    expect(formatSalary(undefined)).toBe('—')
    expect(formatSalary('')).toBe('—')
  })

  it('formats numeric salary correctly with currency', () => {
    expect(formatSalary(1200000)).toBe('1,200,000 UZS')
    expect(formatSalary('1200000', 'USD')).toBe('1,200,000 USD')
  })
})

describe('applyApiFieldErrors', () => {
  it('returns false for invalid or empty errors', () => {
    const mockCallback = vi.fn()
    expect(applyApiFieldErrors(null, mockCallback)).toBe(false)
    expect(applyApiFieldErrors({}, mockCallback)).toBe(false)
    expect(mockCallback).not.toHaveBeenCalled()
  })

  it('maps and applies array error details successfully', () => {
    const mockCallback = vi.fn()
    const err = {
      data: {
        error: {
          details: [
            { field: 'email', message: 'Email must be valid' },
            { field: 'password', message: 'Password is too short' },
          ],
        },
      },
    }
    expect(applyApiFieldErrors(err, mockCallback)).toBe(true)
    expect(mockCallback).toHaveBeenCalledTimes(2)
    expect(mockCallback).toHaveBeenNthCalledWith(1, 'email', 'Email must be valid')
    expect(mockCallback).toHaveBeenNthCalledWith(2, 'password', 'Password is too short')
  })

  it('works with direct parsed body instead of full FetchError', () => {
    const mockCallback = vi.fn()
    const directBody = {
      error: {
        details: [{ field: 'email', message: 'Email must be valid' }],
      },
    }
    expect(applyApiFieldErrors(directBody, mockCallback)).toBe(true)
    expect(mockCallback).toHaveBeenCalledWith('email', 'Email must be valid')
  })
})

describe('extractApiErrorMessage', () => {
  it('reads nested error message', () => {
    const err = { data: { error: { message: 'Invalid email' } } }
    expect(extractApiErrorMessage(err)).toBe('Invalid email')
  })

  it('joins array messages', () => {
    const err = { data: { error: { message: ['a', 'b'] } } }
    expect(extractApiErrorMessage(err)).toBe('a, b')
  })

  it('reads standard NestJS error message when error is a string', () => {
    const err = {
      data: {
        statusCode: 409,
        message: 'Email already registered',
        error: 'Conflict',
      },
    }
    expect(extractApiErrorMessage(err)).toBe('Email already registered')
  })

  it('reads standard NestJS error message when error is nested', () => {
    const err = {
      data: {
        error: {
          statusCode: 409,
          message: 'Email already registered',
          error: 'Conflict',
        },
      },
    }
    expect(extractApiErrorMessage(err)).toBe('Email already registered')
  })

  it('returns fallback for unknown errors', () => {
    expect(extractApiErrorMessage(null, 'fallback')).toBe('fallback')
  })
})
