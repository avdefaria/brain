
-- 1. Add missing columns to squads
ALTER TABLE public.squads ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3D4FE8';
ALTER TABLE public.squads ADD COLUMN IF NOT EXISTS leader_id UUID REFERENCES auth.users(id);

-- 2. Add birth_date to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date DATE;

-- 3. Create company_events table
CREATE TABLE IF NOT EXISTS public.company_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    date DATE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('event', 'commercial', 'internal')),
    repeat_annually BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Enable RLS and Grants for company_events
ALTER TABLE public.company_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_events TO authenticated;
GRANT ALL ON public.company_events TO service_role;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can read events' AND tablename = 'company_events') THEN
        CREATE POLICY "Authenticated users can read events" ON public.company_events FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage events' AND tablename = 'company_events') THEN
        CREATE POLICY "Admins can manage events" ON public.company_events FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;

-- 5. Create special_projects table (for the timeline)
CREATE TABLE IF NOT EXISTS public.special_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    squad_id UUID REFERENCES public.squads(id) ON DELETE SET NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3D4FE8',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.special_projects ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.special_projects TO authenticated;
GRANT ALL ON public.special_projects TO service_role;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can read special projects' AND tablename = 'special_projects') THEN
        CREATE POLICY "Authenticated users can read special projects" ON public.special_projects FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can manage special projects' AND tablename = 'special_projects') THEN
        CREATE POLICY "Authenticated users can manage special projects" ON public.special_projects FOR ALL TO authenticated USING (true);
    END IF;
END $$;

-- 6. Clean invalid squad data in clients table
UPDATE public.clients SET squad_id = NULL WHERE squad_id::text NOT IN (SELECT id::text FROM public.squads);

-- 7. Seed Squads if none exist
INSERT INTO public.squads (name, color)
VALUES 
    ('Squad Alpha', '#3D4FE8'),
    ('Squad Beta', '#22C55E'),
    ('Squad Gamma', '#F5A524'),
    ('Squad Delta', '#EF4444')
ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color;

-- 8. Seed some commercial dates
INSERT INTO public.company_events (name, date, type, repeat_annually)
VALUES 
    ('Dia das Mães', '2026-05-10', 'commercial', TRUE),
    ('Dia dos Pais', '2026-08-09', 'commercial', TRUE),
    ('Dia dos Namorados', '2026-06-12', 'commercial', TRUE),
    ('Black Friday', '2026-11-27', 'commercial', FALSE),
    ('Natal', '2026-12-25', 'commercial', TRUE),
    ('Dia do Consumidor', '2026-03-15', 'commercial', TRUE),
    ('Dia das Crianças', '2026-10-12', 'commercial', TRUE)
ON CONFLICT DO NOTHING;
