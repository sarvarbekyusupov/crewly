export interface ApiErrorBody {
  error?: {
    code?: string
    message?: string | string[]
    details?: unknown
  }
  message?: string
}

export interface FetchLikeError {
  status?: number
  statusCode?: number
  data?: ApiErrorBody
  message?: string
}

export function isFetchLikeError(e: unknown): e is FetchLikeError {
  return typeof e === 'object' && e !== null
}

export function getFetchStatus(e: unknown): number {
  if (!isFetchLikeError(e)) return 0
  return e.status ?? e.statusCode ?? 0
}
