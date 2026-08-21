CREATE TABLE IF NOT EXISTS public.lead_sales_channels (
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    sales_channel_id UUID REFERENCES public.sales_channels(id) ON DELETE CASCADE,
    PRIMARY KEY (lead_id, sales_channel_id)
);

GRANT SELECT, INSERT, DELETE ON public.lead_sales_channels TO authenticated;
GRANT ALL ON public.lead_sales_channels TO service_role;

ALTER TABLE public.lead_sales_channels ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'lead_sales_channels' 
        AND policyname = 'Authenticated users can manage lead sales channels'
    ) THEN
        CREATE POLICY "Authenticated users can manage lead sales channels" 
        ON public.lead_sales_channels FOR ALL 
        TO authenticated 
        USING (true);
    END IF;
END $$;

-- Ensure DELETE on leads is allowed
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can delete leads" ON public.leads;
    CREATE POLICY "Users can delete leads" 
    ON public.leads FOR DELETE 
    TO authenticated 
    USING (true);
END $$;
