-- Force clean column addition
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS time_tracked_seconds integer DEFAULT 0;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS timer_started_at timestamptz DEFAULT NULL;

-- Cleanup descriptions again just in case
UPDATE public.tasks 
SET description = regexp_replace(description, '<p>|</p>', '', 'g')
WHERE description LIKE '%<p>%' OR description LIKE '%</p>%';
