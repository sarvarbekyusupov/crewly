import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useProfileCompletion } from './useProfileCompletion'

const full = {
  fullName: 'Sarvar',
  phone: '+998901234567',
  city: 'Tashkent',
  currentPosition: 'Engineer',
  currentCompany: 'Acme',
  preferredWorkMode: 'remote',
  resumeFileUrl: 'https://s3.example.com/cv.pdf',
  telegramUsername: '@sarvar',
  yearsExperience: 3,
  skills: ['Vue.js', 'TypeScript'],
}

describe('useProfileCompletion', () => {
  it('returns 0% and all 10 fields missing for null profile', () => {
    const { percent, missing } = useProfileCompletion(ref(null))
    expect(percent.value).toBe(0)
    expect(missing.value).toHaveLength(10)
  })

  it('returns 0% for empty object', () => {
    const { percent, missing } = useProfileCompletion(ref({}))
    expect(percent.value).toBe(0)
    expect(missing.value).toHaveLength(10)
  })

  it('returns 100% for fully filled profile', () => {
    const { percent, missing } = useProfileCompletion(ref(full))
    expect(percent.value).toBe(100)
    expect(missing.value).toHaveLength(0)
  })

  it('treats empty string as missing', () => {
    const { missing } = useProfileCompletion(ref({ ...full, phone: '' }))
    expect(missing.value).toContain('Phone')
  })

  it('treats empty skills array as missing', () => {
    const { missing } = useProfileCompletion(ref({ ...full, skills: [] }))
    expect(missing.value).toContain('Skills')
  })

  it('treats non-empty skills as filled', () => {
    const { missing } = useProfileCompletion(ref({ ...full, skills: ['Vue.js'] }))
    expect(missing.value).not.toContain('Skills')
  })

  it('calculates correct percent for partial profile', () => {
    // Fill 5 of 10 fields
    const { percent } = useProfileCompletion(ref({
      fullName: 'Sarvar',
      city: 'Tashkent',
      currentPosition: 'Dev',
      yearsExperience: 2,
      skills: ['Vue'],
    }))
    expect(percent.value).toBe(50)
  })

  it('missing array contains human-readable labels', () => {
    const { missing } = useProfileCompletion(ref({}))
    expect(missing.value).toContain('Full name')
    expect(missing.value).toContain('CV / Resume')
    expect(missing.value).toContain('Work mode')
    expect(missing.value).toContain('Skills')
  })

  it('reacts to profile ref updates', () => {
    const profile = ref<typeof full | null>(null)
    const { percent } = useProfileCompletion(profile)

    expect(percent.value).toBe(0)
    profile.value = full
    expect(percent.value).toBe(100)
  })

  it('yearsExperience: 0 counts as filled (truthy number)', () => {
    // 0 is a valid experience value — not empty string/null/undefined
    const { missing } = useProfileCompletion(ref({ ...full, yearsExperience: 0 }))
    expect(missing.value).not.toContain('Years experience')
  })
})
