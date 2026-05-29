import type { Application } from '~/types/api'

export interface KanbanStage {
  key: string
  labelKey: string
  color: string
}

export const APPLICATION_KANBAN_STAGES: KanbanStage[] = [
  { key: 'matched', labelKey: 'matched', color: 'var(--ink-subtle)' },
  { key: 'outreach_sent', labelKey: 'outreach_sent', color: 'var(--status-outreach)' },
  { key: 'responded', labelKey: 'responded', color: 'var(--status-responded)' },
  { key: 'screening', labelKey: 'screening', color: 'var(--warn)' },
  { key: 'screened_pass', labelKey: 'screened_pass', color: 'var(--positive)' },
  { key: 'delivered', labelKey: 'delivered', color: 'var(--accent)' },
  { key: 'interview_scheduled', labelKey: 'interview_scheduled', color: 'var(--status-interview)' },
  { key: 'interviewed', labelKey: 'interviewed', color: 'var(--status-interviewed)' },
  { key: 'offered', labelKey: 'offered', color: 'var(--status-offered)' },
  { key: 'hired', labelKey: 'hired', color: 'var(--positive)' },
]

export const HIRING_PIPELINE_STEPS = [
  { status: 'matched', actions: ['approve'] },
  { status: 'delivered', actions: ['approve', 'reject'] },
  { status: 'interview_scheduled', actions: ['markInterviewed', 'reject'] },
  { status: 'interviewed', actions: ['makeOffer', 'reject', 'hire'] },
  { status: 'offered', actions: ['hire', 'reject'] },
  { status: 'hired', actions: [] },
] as const

export function groupApplicationsByStage(applications: Application[]) {
  return APPLICATION_KANBAN_STAGES.map((stage) => ({
    ...stage,
    cards: applications.filter((a) => a.status === stage.key),
  }))
}

const STEP_MAP: Record<string, number> = {
  matched: 0,
  queued_outreach: 0,
  outreach_sent: 0,
  no_response: 0,
  responded: 1,
  screening: 1,
  screened_fail: 1,
  screened_pass: 2,
  delivered: 2,
  interview_scheduled: 3,
  interviewed: 4,
  offered: 5,
  hired: 6,
  withdrew: -1,
}

export function hiringStepIndex(status: string): number {
  return status in STEP_MAP ? STEP_MAP[status] : -1
}
