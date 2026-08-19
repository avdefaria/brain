DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'sales_channels') THEN
        ALTER TABLE public.clients ADD COLUMN sales_channels text[] DEFAULT '{}';
    END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
