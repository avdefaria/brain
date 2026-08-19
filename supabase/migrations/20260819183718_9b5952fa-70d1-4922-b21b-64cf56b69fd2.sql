-- Create sales_channels table
CREATE TABLE public.sales_channels (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    created_at timestamptz DEFAULT now()
);

-- Create client_sales_channels junction table
CREATE TABLE public.client_sales_channels (
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
    sales_channel_id uuid REFERENCES public.sales_channels(id) ON DELETE CASCADE,
    PRIMARY KEY (client_id, sales_channel_id)
);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_channels TO authenticated;
GRANT ALL ON public.sales_channels TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_sales_channels TO authenticated;
GRANT ALL ON public.client_sales_channels TO service_role;

-- RLS
ALTER TABLE public.sales_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_sales_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users on sales_channels" ON public.sales_channels
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users on client_sales_channels" ON public.client_sales_channels
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed initial channels
INSERT INTO public.sales_channels (name) VALUES
('Mercado Livre'),
('Shopee'),
('Amazon'),
('TikTok Shop'),
('Magalu'),
('Americanas'),
('Shein'),
('Loja própria'),
('Instagram')
ON CONFLICT (name) DO NOTHING;
