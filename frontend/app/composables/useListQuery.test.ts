import { describe, expect, it } from 'vitest'
import { listQueryKey } from './useListQuery'

describe('listQueryKey', () => {
  it('builds stable keys from filters', () => {
    expect(listQueryKey('jobs', { status: 'active', page: 2 })).toBe('jobs?page=2&status=active')
  })

  it('omits empty values', () => {
    expect(listQueryKey('apps', { status: '', page: 1 })).toBe('apps?page=1')
  })
})
