CREATE TABLE IF NOT EXISTS public.security_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    user_id uuid REFERENCES auth.users(id),
    action text NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    details jsonb,
    error_message text
);

GRANT INSERT ON public.security_logs TO authenticated;
GRANT ALL ON public.security_logs TO service_role;

ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only insert their own logs" 
ON public.security_logs FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all logs" 
ON public.security_logs FOR SELECT 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));
