-- Create leads table
CREATE TABLE IF NOT EXISTS public.leads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    company text,
    email text,
    phone text,
    recurring_revenue numeric DEFAULT 0,
    one_time_revenue numeric DEFAULT 0,
    expected_close_date date,
    responsible_id uuid REFERENCES public.profiles(id),
    monthly_revenue_range text,
    niche_id uuid REFERENCES public.niches(id),
    origin text,
    notes text,
    funnel_stage text DEFAULT 'novos_leads',
    position integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- Add lead_id to clients table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='lead_id') THEN
        ALTER TABLE public.clients ADD COLUMN lead_id uuid REFERENCES public.leads(id);
    END IF;
END $$;

-- Grants
GRANT SELECT, INSERT, UPDATE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
GRANT ALL ON public.leads TO anon;

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leads
DROP POLICY IF EXISTS "Authenticated users can select leads" ON public.leads;
CREATE POLICY "Authenticated users can select leads" 
ON public.leads FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert leads" ON public.leads;
CREATE POLICY "Authenticated users can insert leads" 
ON public.leads FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update leads" ON public.leads;
CREATE POLICY "Authenticated users can update leads" 
ON public.leads FOR UPDATE TO authenticated USING (true);
