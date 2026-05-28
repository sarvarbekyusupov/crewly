import { z } from 'zod';

export const SignupSchema = z.object({
  companyName: z.string().min(2).max(200),
  contactEmail: z.string().email(),
  fullName: z.string().min(2).max(200),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(100),
});

export type SignupDto = z.infer<typeof SignupSchema>;
export type LoginDto = z.infer<typeof LoginSchema>;
