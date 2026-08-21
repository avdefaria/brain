-- Create churn_reasons table
CREATE TABLE public.churn_reasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add churn tracking columns to clients
ALTER TABLE public.clients 
ADD COLUMN cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN churn_reason_id UUID REFERENCES public.churn_reasons(id);

-- Seed default churn reasons
INSERT INTO public.churn_reasons (name) VALUES 
('Preço'), 
('Concorrência'), 
('Suporte'), 
('Outros');

-- RLS and Grants
ALTER TABLE public.churn_reasons ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.churn_reasons TO authenticated;
GRANT ALL ON public.churn_reasons TO service_role;
GRANT SELECT ON public.churn_reasons TO anon;

CREATE POLICY "Allow authenticated to select churn_reasons" ON public.churn_reasons
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated to insert churn_reasons" ON public.churn_reasons
    FOR INSERT TO authenticated WITH CHECK (true);

-- Ensure authenticated can update status/cancelled_at/churn_reason_id on clients
GRANT UPDATE(status, cancelled_at, churn_reason_id) ON public.clients TO authenticated;