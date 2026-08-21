
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP WITH TIME ZONE;
COMMENT ON COLUMN public.leads.converted_at IS 'Timestamp of when the lead was converted to a client';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'lead_id'
    ) THEN
        ALTER TABLE public.clients ADD COLUMN lead_id UUID REFERENCES public.leads(id);
    END IF;
END
$$;
