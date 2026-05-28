import { z } from 'zod';

export const RecordSeparationSchema = z.object({
  separationDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'separationDate must be YYYY-MM-DD'),
  replacementRequired: z.boolean().optional(),
});

export type RecordSeparationDto = z.infer<typeof RecordSeparationSchema>;
