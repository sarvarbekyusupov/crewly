export function formatDate(s?: string): string {
  if (!s) return '—'
  return new Date(s).toLocaleDateString()
}

export function formatDateTime(s?: string): string {
  if (!s) return '—'
  return new Date(s).toLocaleString()
}

export function formatRelativeTime(s: string): string {
  const diff = Math.floor((Date.now() - new Date(s).getTime()) / 60000)
  if (diff < 1) return 'just now'
  if (diff < 60) return `${diff}m ago`
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
  return `${Math.floor(diff / 1440)}d ago`
}

export function formatSalary(v?: string | number, currency = 'UZS'): string {
  if (v === undefined || v === null || v === '') return '—'
  return Number(v).toLocaleString() + ' ' + currency
}

export function applyApiFieldErrors(
  e: unknown,
  setFieldError: (field: string, message: string) => void,
): boolean {
  if (e && typeof e === 'object') {
    const data = (e as Record<string, unknown>)?.data as Record<string, unknown> | undefined
    const details = (data?.error as Record<string, unknown>)?.details
    if (Array.isArray(details) && details.length > 0) {
      ;(details as Array<{ field?: string; message?: string }>).forEach((d) => {
        if (d.field && d.message) setFieldError(d.field, d.message)
      })
      return true
    }
  }
  return false
}

export function extractApiErrorMessage(e: unknown, fallback = 'Request failed'): string {
  if (e && typeof e === 'object') {
    const err = e as Record<string, unknown>
    const data = err?.data as Record<string, unknown> | undefined
    const errorObj = data?.error
    let msg: unknown

    if (errorObj && typeof errorObj === 'object') {
      msg = (errorObj as Record<string, unknown>).message
      const details = (errorObj as Record<string, unknown>).details
      if (Array.isArray(details) && details.length > 0) {
        const detailMsgs = (details as Array<{ field?: string; message?: string }>)
          .map((d) => (d.field ? `${d.field}: ${d.message}` : d.message))
          .filter(Boolean)
        if (detailMsgs.length) return detailMsgs.join('\n')
      }
    } else if (
      typeof errorObj === 'string' &&
      errorObj !== 'Unauthorized' &&
      errorObj !== 'Forbidden'
    ) {
      msg = errorObj
    }

    if (!msg) msg = data?.message
    if (!msg) msg = err?.message

    if (Array.isArray(msg)) return msg.join(', ')
    if (msg && typeof msg === 'string') return msg
    if (msg && typeof msg === 'number') return fallback
  }
  return fallback
}
