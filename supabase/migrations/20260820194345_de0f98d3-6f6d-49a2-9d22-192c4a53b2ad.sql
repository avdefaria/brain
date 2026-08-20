ALTER TABLE public.task_history 
ADD CONSTRAINT task_history_user_id_profiles_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) 
ON DELETE SET NULL;

GRANT SELECT ON public.task_history TO authenticated;
GRANT ALL ON public.task_history TO service_role;