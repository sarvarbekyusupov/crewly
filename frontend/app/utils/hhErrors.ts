export function isHhNotConnected(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false
  const err = e as Record<string, unknown>
  const status = err.status ?? (err.response as any)?.status ?? (err.data as any)?.statusCode
  if (status !== 422) return false
  const data = (err.data ?? err.response) as Record<string, unknown> | undefined
  const code = data?.code ?? (data?.data as any)?.code
  return code === 'hh_not_connected'
}
