import { z } from 'zod'

export const candidateProfileSchema = z.object({
  fullName: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  currentPosition: z.string().optional(),
  currentCompany: z.string().optional(),
  linkedinUrl: z.union([z.string().url('Enter a valid LinkedIn URL'), z.literal('')]).optional(),
  githubUrl: z.union([z.string().url('Enter a valid GitHub URL'), z.literal('')]).optional(),
  preferredWorkMode: z.string().optional(),
  willingToRelocate: z.boolean().optional(),
  yearsExperience: z.coerce.number().min(0).max(100).optional(),
  noticePeriodDays: z.coerce.number().min(0).max(365).optional(),
  telegramUsername: z.string().optional(),
  parsedResume: z.any().optional(),
})

export const candidatePreferencesSchema = z.object({
  minMatchScore: z.coerce.number().min(0).max(100),
  maxApplicationsPerDay: z.coerce.number().min(1).max(50),
  preferredWorkMode: z.string().optional(),
  expectedSalaryUzs: z.string().optional(),
  hhResumeId: z.string().optional(),
})

export type CandidateProfileInput = z.infer<typeof candidateProfileSchema>
export type CandidatePreferencesInput = z.infer<typeof candidatePreferencesSchema>
