
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'task_assignees' AND constraint_type = 'FOREIGN KEY' AND constraint_name = 'task_assignees_user_id_fkey'
    ) THEN
        ALTER TABLE public.task_assignees 
        ADD CONSTRAINT task_assignees_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

GRANT SELECT ON public.task_assignees TO authenticated;
GRANT ALL ON public.task_assignees TO service_role;

ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_assignees' AND policyname = 'Authenticated users can see task assignees') THEN
        CREATE POLICY "Authenticated users can see task assignees" ON public.task_assignees FOR SELECT TO authenticated USING (true);
    END IF;
END $$;
