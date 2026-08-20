ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS time_tracked_seconds integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS timer_started_at timestamptz DEFAULT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
