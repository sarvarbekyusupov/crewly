export function safeUrl(url: string | null | undefined): string {
  if (!url) return '#'
  try {
    const { protocol } = new URL(url)
    if (protocol === 'https:' || protocol === 'http:') return url
  } catch {}
  return '#'
}
