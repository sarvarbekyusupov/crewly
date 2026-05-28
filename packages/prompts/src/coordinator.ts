export function coordinatorDecidePrompt(
  context: {
    eventType: string;
    entityType: string;
    entityId: string;
    currentStatus: string;
  },
  metadata?: unknown,
): string {
  return `Decide the next best step in the recruitment pipeline.
Event: ${context.eventType}
Entity: ${context.entityType} (${context.entityId})
Status: ${context.currentStatus}
Metadata: ${JSON.stringify(metadata ?? {})}

Available Actions:
- trigger_sourcing: Find more candidates or jobs.
- trigger_matching: Re-evaluate fit.
- trigger_screening: Start or advance AI interview.
- schedule_interview: Candidate passed screening. Book a meeting.
- notify_human: Alert a human recruiter for manual review.
- wait: Do nothing for now.

Return a JSON object:
{"action": "...", "reason": "..."}`;
}
