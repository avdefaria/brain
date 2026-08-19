-- Garante que o papel authenticated tenha as permissões necessárias
GRANT SELECT, INSERT, UPDATE, DELETE ON public.niches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_channels TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_sales_channels TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;

GRANT ALL ON public.niches TO service_role;
GRANT ALL ON public.sales_channels TO service_role;
GRANT ALL ON public.client_sales_channels TO service_role;
GRANT ALL ON public.clients TO service_role;

-- Garante que o papel anon possa ler nichos e canais (opcional, mas ajuda se houver lag de auth)
GRANT SELECT ON public.niches TO anon;
GRANT SELECT ON public.sales_channels TO anon;

-- Garante permissão em todas as colunas
ALTER TABLE public.niches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_sales_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Recria políticas simplificadas para garantir acesso
DROP POLICY IF EXISTS "Allow select for all authenticated users" ON public.niches;
CREATE POLICY "Allow select for all authenticated users" ON public.niches FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert for all authenticated users" ON public.niches;
CREATE POLICY "Allow insert for all authenticated users" ON public.niches FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow select for all authenticated users" ON public.sales_channels;
CREATE POLICY "Allow select for all authenticated users" ON public.sales_channels FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert for all authenticated users" ON public.sales_channels;
CREATE POLICY "Allow insert for all authenticated users" ON public.sales_channels FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.client_sales_channels;
CREATE POLICY "Allow all for authenticated users" ON public.client_sales_channels FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.clients;
CREATE POLICY "Allow all for authenticated users" ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
