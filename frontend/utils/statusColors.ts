export function jobStatusColor(s: string): string {
  const map: Record<string, string> = {
    draft: 'neutral',
    active: 'success',
    paused: 'warning',
    filled: 'primary',
    cancelled: 'error',
  }
  return map[s] ?? 'neutral'
}

export function appStatusColor(s: string): string {
  const map: Record<string, string> = {
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

export function invoiceStatusColor(s: string): string {
  const map: Record<string, string> = {
    draft: 'neutral',
    issued: 'info',
    paid: 'success',
    overdue: 'error',
    cancelled: 'neutral',
  }
  return map[s] ?? 'neutral'
}

export function ingestionStatusColor(s: string): string {
  const map: Record<string, string> = {
    running: 'info',
    completed: 'success',
    failed: 'error',
    partial: 'warning',
  }
  return map[s] ?? 'neutral'
}

export function companyStatusColor(s: string): string {
  return s === 'active' ? 'success' : s === 'suspended' ? 'warning' : 'neutral'
}
