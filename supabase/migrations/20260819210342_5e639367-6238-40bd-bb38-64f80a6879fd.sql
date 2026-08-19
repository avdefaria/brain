ALTER TABLE public.client_sales_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.niches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.niches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_channels TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_sales_channels TO authenticated;

GRANT ALL ON public.clients TO service_role;
GRANT ALL ON public.niches TO service_role;
GRANT ALL ON public.sales_channels TO service_role;
GRANT ALL ON public.client_sales_channels TO service_role;

DROP POLICY IF EXISTS "Allow all for authenticated users on client_sales_channels" ON public.client_sales_channels;
CREATE POLICY "Allow all for authenticated users on client_sales_channels"
ON public.client_sales_channels FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated to select niches" ON public.niches;
DROP POLICY IF EXISTS "Allow all authenticated to insert niches" ON public.niches;
DROP POLICY IF EXISTS "Allow all authenticated to update niches" ON public.niches;
CREATE POLICY "Allow all for authenticated users on niches"
ON public.niches FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated users on sales_channels" ON public.sales_channels;
CREATE POLICY "Allow all for authenticated users on sales_channels"
ON public.sales_channels FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can select clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can update clients" ON public.clients;
CREATE POLICY "Allow all for authenticated users on clients"
ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);