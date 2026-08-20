-- 1. Create task_history table
CREATE TABLE IF NOT EXISTS public.task_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    changes JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;

-- 3. Grants
GRANT SELECT, INSERT ON public.task_history TO authenticated;
GRANT ALL ON public.task_history TO service_role;

-- 4. Policies
CREATE POLICY "Users can view history of tasks they can see"
ON public.task_history FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_history.task_id
  )
);

CREATE POLICY "Users can insert history for tasks"
ON public.task_history FOR INSERT
TO authenticated
WITH CHECK (true);