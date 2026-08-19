-- Create niches table
CREATE TABLE public.niches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.niches TO authenticated;
GRANT ALL ON public.niches TO service_role;

-- Enable RLS
ALTER TABLE public.niches ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow all authenticated to select niches" ON public.niches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all authenticated to insert niches" ON public.niches FOR INSERT TO authenticated WITH CHECK (true);

-- Seed initial niches
INSERT INTO public.niches (name) VALUES 
('Moda'), ('Decoração'), ('Ferramentas'), ('Beleza e Cosméticos'), 
('Casa e Jardim'), ('Eletrônicos'), ('Pet'), ('Infantil'), 
('Esporte e Fitness'), ('Alimentos e Bebidas'), ('Saúde e Bem-estar'), 
('Automotivo'), ('Papelaria'), ('Joias e Acessórios')
ON CONFLICT (name) DO NOTHING;

-- Add niche_id to clients
ALTER TABLE public.clients ADD COLUMN niche_id UUID REFERENCES public.niches(id);

-- Cleanup mock data from clients
DELETE FROM public.clients WHERE name IN ('TechFlow Systems', 'Global Logistics', 'Urban Eats');