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

export function extractApiErrorMessage(e: unknown, fallback = 'Request failed'): string {
  if (e && typeof e === 'object') {
    const err = e as Record<string, unknown>
    const data = err?.data as Record<string, unknown> | undefined
    const errorObj = data?.error
    let msg: unknown

    if (errorObj && typeof errorObj === 'object') {
      msg = (errorObj as Record<string, unknown>).message
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
