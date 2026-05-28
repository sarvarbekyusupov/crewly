import { z } from 'zod';

export const UpdateApplicationSchema = z.object({
  hiringManagerNotes: z.string().optional(),
});

export const RejectApplicationSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const HireApplicationSchema = z.object({
  agreedSalaryUzs: z.number().int().positive(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be YYYY-MM-DD'),
});

export const BulkRejectSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  reason: z.string().max(1000).optional(),
});

export const BulkApproveSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

export const SubmitDebriefSchema = z.object({
  feedback: z.string().min(1).max(10_000),
});

export const UploadTranscriptSchema = z.object({
  transcript: z.string().min(1).max(50_000),
});

export type UpdateApplicationDto = z.infer<typeof UpdateApplicationSchema>;
export type RejectApplicationDto = z.infer<typeof RejectApplicationSchema>;
export type HireApplicationDto = z.infer<typeof HireApplicationSchema>;
export type BulkRejectDto = z.infer<typeof BulkRejectSchema>;
export type BulkApproveDto = z.infer<typeof BulkApproveSchema>;
export type SubmitDebriefDto = z.infer<typeof SubmitDebriefSchema>;
export type UploadTranscriptDto = z.infer<typeof UploadTranscriptSchema>;
