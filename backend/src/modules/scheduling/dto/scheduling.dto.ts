import { z } from 'zod';

export const ScheduleInterviewSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  attendeeEmails: z.array(z.string().email()).max(10).default([]),
  timeZone: z.string().max(50).optional(),
});

export type ScheduleInterviewDto = z.infer<typeof ScheduleInterviewSchema>;
