export type SseEventPayload = {
  type: string
  payload: Record<string, unknown>
}

export type IngestionProgressPayload = {
  runId: string
  status: string
  fetched: number
  created: number
  updated: number
  failed: number
}

export type StaffSseEventPayload = {
  type: string
  payload: IngestionProgressPayload & Record<string, unknown>
  timestamp?: string
}
