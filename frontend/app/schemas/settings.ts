import { z } from 'zod'
import { emailField } from './auth'

export const companySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  website: z.string().optional(),
  industry: z.string().optional(),
  size: z.string().optional(),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
})

export const inviteMemberSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: emailField,
  role: z.enum(['admin', 'hiring_manager', 'viewer']),
})

export type CompanyInput = z.infer<typeof companySchema>
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>
