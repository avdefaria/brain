ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS mrr_months INTEGER;
GRANT ALL ON public.contracts TO authenticated, service_role;