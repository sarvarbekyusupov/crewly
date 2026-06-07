export function capitalizeStatus(s: string): string {
  return s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

export function candidateCompleteness(
  p: {
    fullName?: string | null
    phone?: string | null
    city?: string | null
    currentPosition?: string | null
    currentCompany?: string | null
    preferredWorkMode?: string | null
    resumeFileUrl?: string | null
    skills?: string[]
  } | null,
): number {
  if (!p) return 0
  const fields = [
    p.fullName,
    p.phone,
    p.city,
    p.currentPosition,
    p.currentCompany,
    p.preferredWorkMode,
    p.resumeFileUrl,
  ]
  const hasSkills = (p.skills?.length ?? 0) > 0 ? 1 : 0
  return Math.round(((fields.filter(Boolean).length + hasSkills) / (fields.length + 1)) * 100)
}
