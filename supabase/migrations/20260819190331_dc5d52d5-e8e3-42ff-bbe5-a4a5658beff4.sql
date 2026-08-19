-- Ensure RLS is enabled and policies exist for all relevant tables
ALTER TABLE public.niches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_sales_channels ENABLE ROW LEVEL SECURITY;

-- Niches policies
DROP POLICY IF EXISTS "Allow all authenticated to select niches" ON public.niches;
CREATE POLICY "Allow all authenticated to select niches" ON public.niches FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow all authenticated to insert niches" ON public.niches;
CREATE POLICY "Allow all authenticated to insert niches" ON public.niches FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all authenticated to update niches" ON public.niches;
CREATE POLICY "Allow all authenticated to update niches" ON public.niches FOR UPDATE TO authenticated USING (true);

-- Sales Channels policies
DROP POLICY IF EXISTS "Allow all for authenticated users on sales_channels" ON public.sales_channels;
CREATE POLICY "Allow all for authenticated users on sales_channels" ON public.sales_channels FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Junction table policies
DROP POLICY IF EXISTS "Allow all for authenticated users on client_sales_channels" ON public.client_sales_channels;
CREATE POLICY "Allow all for authenticated users on client_sales_channels" ON public.client_sales_channels FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Explicit Grants (Crucial for PostgREST)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.niches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_channels TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_sales_channels TO authenticated;
GRANT ALL ON public.niches TO service_role;
GRANT ALL ON public.sales_channels TO service_role;
GRANT ALL ON public.client_sales_channels TO service_role;

-- Repopulate if missing (idempotent)
INSERT INTO public.sales_channels (name) VALUES
('Mercado Livre'), ('Shopee'), ('Amazon'), ('TikTok Shop'), ('Magalu'), 
('Americanas'), ('Shein'), ('Loja própria'), ('Instagram')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.niches (name) VALUES 
('Moda'), ('Decoração'), ('Ferramentas'), ('Beleza e Cosméticos'), 
('Casa e Jardim'), ('Eletrônicos'), ('Pet'), ('Infantil'), 
('Esporte e Fitness'), ('Alimentos e Bebidas'), ('Saúde e Bem-estar'), 
('Automotivo'), ('Papelaria'), ('Joias e Acessórios')
ON CONFLICT (name) DO NOTHING;
