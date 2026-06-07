import { describe, it, expect } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useAudience } from './useAudience'

const mockCookie = { value: 'employer' }
const mockState = { value: 'employer' }

mockNuxtImport('useCookie', () => {
  return () => mockCookie
})

mockNuxtImport('useState', () => {
  return () => mockState
})

describe('useAudience', () => {
  it('gets and sets audience correctly', () => {
    const { audience, set } = useAudience()

    expect(audience.value).toBe('employer')

    set('candidate')
    expect(audience.value).toBe('candidate')
    expect(mockCookie.value).toBe('candidate')
  })
})
