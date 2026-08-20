ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS time_tracked_seconds integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS timer_started_at timestamptz DEFAULT NULL;
