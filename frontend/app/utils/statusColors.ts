export type BadgeColor =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'info'
  | 'warning'
  | 'error'
  | 'neutral'

export function jobStatusColor(s: string): BadgeColor {
  const map: Record<string, BadgeColor> = {
    draft: 'neutral',
    active: 'success',
    paused: 'warning',
    filled: 'primary',
    cancelled: 'error',
  }
  return map[s] ?? 'neutral'
}

export function appStatusColor(s: string): BadgeColor {
  const map: Record<string, BadgeColor> = {
    matched: 'neutral',
    queued_outreach: 'neutral',
    outreach_sent: 'info',
    responded: 'info',
    screening: 'warning',
    screened_pass: 'success',
    screened_fail: 'error',
    delivered: 'primary',
    interview_scheduled: 'secondary',
    interviewed: 'secondary',
    offered: 'success',
    hired: 'success',
    rejected_by_client: 'error',
    withdrew: 'neutral',
    no_response: 'neutral',
  }
  return map[s] ?? 'neutral'
}

export function invoiceStatusColor(s: string): BadgeColor {
  const map: Record<string, BadgeColor> = {
    draft: 'neutral',
    issued: 'info',
    paid: 'success',
    overdue: 'error',
    cancelled: 'neutral',
  }
  return map[s] ?? 'neutral'
}

export function ingestionStatusColor(s: string): BadgeColor {
  const map: Record<string, BadgeColor> = {
    running: 'info',
    completed: 'success',
    failed: 'error',
    partial: 'warning',
  }
  return map[s] ?? 'neutral'
}

export function companyStatusColor(s: string): BadgeColor {
  return s === 'active' ? 'success' : s === 'suspended' ? 'warning' : 'neutral'
}
