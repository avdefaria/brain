
-- Primeiro removemos a FK errada que aponta para auth.users (se existir com esse nome)
ALTER TABLE public.task_assignees DROP CONSTRAINT IF EXISTS task_assignees_user_id_fkey;

-- Criamos a FK correta apontando para public.profiles
ALTER TABLE public.task_assignees 
ADD CONSTRAINT task_assignees_user_id_profiles_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Garantimos permissões e RLS
GRANT SELECT ON public.task_assignees TO authenticated;
GRANT ALL ON public.task_assignees TO service_role;
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can see task assignees" ON public.task_assignees;
CREATE POLICY "Authenticated users can see task assignees" ON public.task_assignees FOR SELECT TO authenticated USING (true);
