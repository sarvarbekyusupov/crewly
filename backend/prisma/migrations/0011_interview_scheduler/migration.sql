-- Add Google Calendar fields to applications table
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT,
  ADD COLUMN IF NOT EXISTS google_meet_link TEXT,
  ADD COLUMN IF NOT EXISTS interview_scheduled_at TIMESTAMPTZ;
