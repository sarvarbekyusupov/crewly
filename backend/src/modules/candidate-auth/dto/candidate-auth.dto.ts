import { z } from 'zod';

export const CandidateSignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  fullName: z.string().min(2).max(200).optional(),
});

export const CandidateLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type CandidateSignupDto = z.infer<typeof CandidateSignupSchema>;
export type CandidateLoginDto = z.infer<typeof CandidateLoginSchema>;
