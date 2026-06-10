import DOMPurify from 'dompurify'

export function sanitizeHtml(dirty: string): string {
  if (import.meta.server) {
    // Server-side: strip all tags (DOMPurify is browser-only)
    return dirty
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['p', 'br', 'b', 'strong', 'em', 'i', 'ul', 'ol', 'li', 'a', 'h3', 'h4'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    FORCE_BODY: true,
  })
}
