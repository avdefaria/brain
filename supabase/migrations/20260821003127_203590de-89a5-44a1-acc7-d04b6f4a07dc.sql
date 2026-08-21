ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS mrr_months INTEGER DEFAULT 1;
COMMENT ON COLUMN public.leads.mrr_months IS 'Quantidade de meses de contrato recorrente estimado';
