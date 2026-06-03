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

export function useProfileCompletion(profile: Ref<ProfileCompletionFields | null | undefined>) {
  return computed(() => {
    const p = profile.value
    if (!p) return 0
    const fields = [
      p.fullName,
      p.phone,
      p.city,
      p.currentPosition,
      p.currentCompany,
      p.preferredWorkMode,
      p.resumeFileUrl,
      p.telegramUsername,
      p.yearsExperience,
    ]
    const hasSkills = (p.skills?.length ?? 0) > 0 ? 1 : 0
    const filled = fields.filter((f) => f !== undefined && f !== null && f !== '').length + hasSkills
    return Math.round((filled / (fields.length + 1)) * 100)
  })
}
