export type OptLevel = 'off' | 'honest' | 'aggressive'

export const CV_OPT_OPTIONS: { value: OptLevel; label: string; desc: string }[] = [
  { value: 'off', label: 'Off', desc: 'CV aynan yuboriladi' },
  { value: 'honest', label: 'Honest', desc: 'Ish uchun tajribani qayta tartiblaydi' },
  { value: 'aggressive', label: 'Aggressive', desc: 'CV matnini ish tavsifiga mos yozadi' },
]

export const CL_OPT_OPTIONS: { value: OptLevel; label: string; desc: string }[] = [
  { value: 'off', label: 'Off', desc: 'Cover letter yozilmaydi' },
  { value: 'honest', label: 'Honest', desc: "Ton va urg'uni moslaydi" },
  { value: 'aggressive', label: 'Aggressive', desc: 'Ish tavsifiga mos cover letter yozadi' },
]

export type JobFormatKey = 'remote' | 'hybrid' | 'onsite' | 'abroad'
export const JOB_FORMAT_OPTIONS: { key: JobFormatKey; label: string }[] = [
  { key: 'remote', label: 'Remote' },
  { key: 'hybrid', label: 'Hybrid' },
  { key: 'onsite', label: 'Ofisda' },
  { key: 'abroad', label: 'Xorijda' },
]

export type JobTypeKey = 'fullTime' | 'partTime' | 'freelance' | 'internship'
export const JOB_TYPE_OPTIONS: { key: JobTypeKey; label: string }[] = [
  { key: 'fullTime', label: 'Full-time' },
  { key: 'partTime', label: 'Part-time' },
  { key: 'freelance', label: 'Freelance' },
  { key: 'internship', label: 'Internship' },
]

export const SEEKER_STEPS = ['queued', 'applied', 'viewed', 'interview', 'offer'] as const
export const HR_STEPS = ['outreach_sent', 'screening', 'responded', 'shortlisted', 'offer'] as const

export const APPLICATION_URGENCY = [
  'screening',
  'responded',
  'outreach_sent',
  'interview',
  'shortlisted',
  'applied',
  'viewed',
  'queued',
  'offer',
  'rejected',
  'failed',
] as const
