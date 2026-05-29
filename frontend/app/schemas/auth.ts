import { z } from 'zod'

export const emailField = z.string().email('Invalid email address')
export const passwordField = z.string().min(8, 'Password must be at least 8 characters')

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Password is required'),
})

export const signupSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  contactEmail: emailField,
  fullName: z.string().min(1, 'Full name is required'),
  email: emailField,
  password: passwordField,
})

export const forgotPasswordSchema = z.object({
  email: emailField,
})

export const resetPasswordSchema = z
  .object({
    password: passwordField,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const candidateSignupSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: emailField,
  password: passwordField,
})

export type LoginInput = z.infer<typeof loginSchema>
export type SignupInput = z.infer<typeof signupSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type CandidateSignupInput = z.infer<typeof candidateSignupSchema>
