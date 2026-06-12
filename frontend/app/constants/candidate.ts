export const EXPERIENCE_LEVELS = [
  'Intern',
  'Junior',
  'Middle',
  'Senior',
  'Lead',
  'C-Level',
] as const
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number]

export const EDUCATION_LEVELS = ["O'rta maxsus", 'Bakalavr', 'Magistr', 'PhD', 'Boshqa'] as const
export type EducationLevel = (typeof EDUCATION_LEVELS)[number]

export const INDUSTRIES = [
  'IT',
  'Marketing',
  'Moliya',
  'Savdo',
  'Dizayn',
  'Muhandislik',
  "Ta'lim",
  'Tibbiyot',
  'Boshqa',
] as const
export type Industry = (typeof INDUSTRIES)[number]

export const GENDERS = ['Erkak', 'Ayol', 'Boshqa', "Ko'rsatishni xohlamayman"] as const

export const LANGUAGE_LEVELS = ['Native', 'Fluent', 'C2', 'C1', 'B2', 'B1', 'A2', 'A1'] as const
export type LanguageLevel = (typeof LANGUAGE_LEVELS)[number]

export const NOTICE_PERIOD_OPTIONS = [
  { label: 'Hoziroq', value: 0 },
  { label: '2 hafta', value: 14 },
  { label: '1 oy', value: 30 },
  { label: '2 oy', value: 60 },
  { label: '3 oy', value: 90 },
] as const

export const WORK_MODE_KEYS = ['remote', 'office', 'hybrid'] as const
export type WorkModeKey = (typeof WORK_MODE_KEYS)[number]

export const WORK_MODE_LABELS: Record<string, string> = {
  remote: 'Remote',
  office: 'Ofis',
  hybrid: 'Gibrid',
}
