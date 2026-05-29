/**
 * Build a stable useAsyncData key from route/query parts.
 */
export function listQueryKey(
  prefix: string,
  parts: Record<string, string | number | undefined | null>,
) {
  const segment = Object.entries(parts)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&')
  return segment ? `${prefix}?${segment}` : prefix
}
