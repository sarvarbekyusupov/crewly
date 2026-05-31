export const APPLICATION_STATUSES = [
  'matched',
  'queued_outreach',
  'outreach_sent',
  'no_response',
  'responded',
  'screening',
  'screened_pass',
  'screened_fail',
  'delivered',
  'interview_scheduled',
  'interviewed',
  'offered',
  'hired',
  'rejected_by_client',
  'withdrew',
] as const

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]

export const SEEKER_APPLICATION_STATUSES = [
  'queued',
  'applied',
  'viewed',
  'interview',
  'offer',
  'rejected',
  'failed',
] as const

export type SeekerApplicationStatus = (typeof SEEKER_APPLICATION_STATUSES)[number]

export const JOB_STATUSES = ['draft', 'active', 'paused', 'filled', 'cancelled'] as const

export type JobStatus = (typeof JOB_STATUSES)[number]

export const JOB_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const

export type JobPriority = (typeof JOB_PRIORITIES)[number]

export const INVOICE_STATUSES = ['draft', 'issued', 'paid', 'overdue', 'cancelled'] as const

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

export const CONVERSATION_STATES = [
  'initiated',
  'awaiting_response',
  'in_progress',
  'completed',
  'abandoned',
] as const

export type ConversationState = (typeof CONVERSATION_STATES)[number]

export const SCREENING_STATUSES = [
  'in_progress',
  'completed',
  'abandoned',
  'escalated',
  'failed',
] as const

export type ScreeningStatus = (typeof SCREENING_STATUSES)[number]

export const USER_ROLES = ['owner', 'admin', 'hiring_manager', 'viewer'] as const

export type UserRole = (typeof USER_ROLES)[number]
