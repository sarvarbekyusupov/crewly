import { z } from 'zod';

export const CreateJobSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(50).max(10000),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  requiredSkills: z.array(z.string()).min(1).max(20),
  niceToHaveSkills: z.array(z.string()).max(20).default([]),
  minExperienceYears: z.number().int().min(0).max(40).optional(),
  maxExperienceYears: z.number().int().min(0).max(40).optional(),
  salaryMinUzs: z.number().positive().optional(),
  salaryMaxUzs: z.number().positive().optional(),
  salaryCurrency: z.enum(['UZS', 'USD']).default('UZS'),
  employmentType: z.enum(['full-time', 'part-time', 'contract']).optional(),
  workMode: z.enum(['office', 'hybrid', 'remote']),
  officeLocation: z.string().max(500).optional(),
  feePercentage: z.number().min(0).max(100).default(12),
  feeBasis: z.enum(['annual', 'monthly']).default('annual'),
  targetCandidatesCount: z.number().int().min(1).max(50).default(5),
});

export const UpdateJobSchema = CreateJobSchema.partial().extend({
  status: z
    .enum(['draft', 'active', 'paused', 'filled', 'cancelled'])
    .optional(),
});

export type CreateJobDto = z.infer<typeof CreateJobSchema>;
export type UpdateJobDto = z.infer<typeof UpdateJobSchema>;
