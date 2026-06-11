export interface ProfileCompletionFields {
  fullName?: string
  phone?: string
  city?: string
  currentPosition?: string
  currentCompany?: string
  preferredWorkMode?: string
  resumeFileUrl?: string
  telegramUsername?: string
  yearsExperience?: number | string
  skills?: string[]
}

const FIELD_LABELS: Record<string, string> = {
  fullName: 'Full name',
  phone: 'Phone',
  city: 'City',
  currentPosition: 'Current role',
  currentCompany: 'Current company',
  preferredWorkMode: 'Work mode',
  resumeFileUrl: 'CV / Resume',
  yearsExperience: 'Years experience',
  skills: 'Skills',
}

export function useProfileCompletion(profile: Ref<ProfileCompletionFields | null | undefined>) {
  const missing = computed(() => {
    const p = profile.value
    if (!p) return Object.keys(FIELD_LABELS)
    const gaps: string[] = []
    const scalar: (keyof ProfileCompletionFields)[] = [
      'fullName',
      'phone',
      'city',
      'currentPosition',
      'currentCompany',
      'preferredWorkMode',
      'resumeFileUrl',
      'yearsExperience',
    ]
    for (const key of scalar) {
      const v = p[key] as string | number | undefined
      if (v === undefined || v === null || v === '') gaps.push(FIELD_LABELS[key] ?? key)
    }
    if ((p.skills?.length ?? 0) === 0) gaps.push(FIELD_LABELS.skills ?? 'Skills')
    return gaps
  })

  const percent = computed(() => {
    const total = Object.keys(FIELD_LABELS).length
    const raw = Math.round(((total - missing.value.length) / total) * 100)
    // CV is required for AI matching — cap at 80% when missing
    if (!profile.value?.resumeFileUrl) return Math.min(raw, 80)
    return raw
  })

  return { percent, missing }
}
