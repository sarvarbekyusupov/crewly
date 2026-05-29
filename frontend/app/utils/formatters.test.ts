import { describe, expect, it } from 'vitest'
import { extractApiErrorMessage } from './formatters'

describe('extractApiErrorMessage', () => {
  it('reads nested error message', () => {
    const err = { data: { error: { message: 'Invalid email' } } }
    expect(extractApiErrorMessage(err)).toBe('Invalid email')
  })

  it('joins array messages', () => {
    const err = { data: { error: { message: ['a', 'b'] } } }
    expect(extractApiErrorMessage(err)).toBe('a, b')
  })

  it('returns fallback for unknown errors', () => {
    expect(extractApiErrorMessage(null, 'fallback')).toBe('fallback')
  })
})
