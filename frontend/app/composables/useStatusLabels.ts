export function useStatusLabels() {
  const { t } = useI18n()

  function appStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      matched: t('applications.status.matched'),
      queued_outreach: t('applications.status.queued_outreach'),
      outreach_sent: t('applications.status.outreach_sent'),
      responded: t('applications.status.responded'),
      screening: t('applications.status.screening'),
      screened_pass: t('applications.status.screened_pass'),
      screened_fail: t('applications.status.screened_fail'),
      delivered: t('applications.status.delivered'),
      interview_scheduled: t('applications.status.interview_scheduled'),
      interviewed: t('applications.status.interviewed'),
      offered: t('applications.status.offered'),
      hired: t('applications.status.hired'),
      rejected_by_client: t('applications.status.rejected_by_client'),
      withdrew: t('applications.status.withdrew'),
      no_response: t('applications.status.no_response'),
    }
    return labels[status] ?? status
  }

  function jobStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      draft: t('jobs.status.draft'),
      active: t('jobs.status.active'),
      paused: t('jobs.status.paused'),
      filled: t('jobs.status.filled'),
      cancelled: t('jobs.status.cancelled'),
    }
    return labels[status] ?? status
  }

  function jobPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      low: t('jobs.priority.low'),
      normal: t('jobs.priority.normal'),
      high: t('jobs.priority.high'),
      urgent: t('jobs.priority.urgent'),
    }
    return labels[priority] ?? priority
  }

  function invoiceStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      draft: t('invoices.status.draft'),
      issued: t('invoices.status.issued'),
      paid: t('invoices.status.paid'),
      overdue: t('invoices.status.overdue'),
      cancelled: t('invoices.status.cancelled'),
    }
    return labels[status] ?? status
  }

  function roleLabel(role: string): string {
    const labels: Record<string, string> = {
      owner: t('settings.roles.owner'),
      admin: t('settings.roles.admin'),
      hiring_manager: t('settings.roles.hiring_manager'),
      viewer: t('settings.roles.viewer'),
    }
    return labels[role] ?? role
  }

  function conversationStateLabel(state: string): string {
    const labels: Record<string, string> = {
      initiated: t('conversations.state.initiated'),
      awaiting_response: t('conversations.state.awaiting'),
      in_progress: t('conversations.state.inProgress'),
      completed: t('conversations.state.completed'),
      abandoned: t('conversations.state.abandoned'),
    }
    return labels[state] ?? state
  }

  function screeningStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      in_progress: t('applications.screening.inProgress'),
      completed: t('applications.screening.completed'),
      abandoned: t('applications.screening.abandoned'),
      escalated: t('applications.screening.escalated'),
      failed: t('applications.screening.failed'),
    }
    return labels[status] ?? status
  }

  return {
    appStatusLabel,
    jobStatusLabel,
    jobPriorityLabel,
    invoiceStatusLabel,
    roleLabel,
    conversationStateLabel,
    screeningStatusLabel,
  }
}
