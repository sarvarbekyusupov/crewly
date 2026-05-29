import { z } from 'zod'

export const jobCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
})

export type JobCreateInput = z.infer<typeof jobCreateSchema>
