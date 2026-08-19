
-- Add position column to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- Grant access (though already granted for the table, adding for safety)
GRANT ALL ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;

-- Update existing tasks to have a sequential position if they don't have one
WITH ranked_tasks AS (
  SELECT id, row_number() OVER (PARTITION BY stage ORDER BY created_at) - 1 as new_pos
  FROM public.tasks
)
UPDATE public.tasks
SET position = ranked_tasks.new_pos
FROM ranked_tasks
WHERE tasks.id = ranked_tasks.id;
