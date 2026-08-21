
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS funnel_type_id uuid;

CREATE TABLE IF NOT EXISTS public.funnel_types (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.funnel_types TO authenticated;
GRANT ALL ON public.funnel_types TO service_role;
GRANT SELECT ON public.funnel_types TO anon;

ALTER TABLE public.funnel_types ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'funnel_types' AND policyname = 'Authenticated users can see funnel types') THEN
        CREATE POLICY "Authenticated users can see funnel types" ON public.funnel_types FOR SELECT TO authenticated USING (true);
    END IF;
END
$$;

ALTER TABLE public.leads ADD CONSTRAINT leads_funnel_type_id_fkey FOREIGN KEY (funnel_type_id) REFERENCES public.funnel_types(id) ON DELETE SET NULL;

INSERT INTO public.funnel_types (name) VALUES 
('Prospecção Ativa'), 
('Sessão Estratégica'), 
('Storytelling')
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
