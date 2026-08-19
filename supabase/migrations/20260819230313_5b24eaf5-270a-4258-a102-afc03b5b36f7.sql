-- 1. Create the accounts table
CREATE TABLE public.accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    squad_id uuid REFERENCES public.squads(id),
    niche_id uuid REFERENCES public.niches(id),
    sales_channel_id uuid, -- Reserved for future use
    account_name text,
    status public.client_status,
    risk_level public.risk_level, -- Corrected type name from audit
    health_score integer,
    start_date date,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- 2. Grants for Data API access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounts TO authenticated;
GRANT ALL ON public.accounts TO service_role;

-- 3. Enable RLS
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policy (matching clients table)
CREATE POLICY "Allow all for authenticated users"
ON public.accounts
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 5. Populate accounts from existing clients
INSERT INTO public.accounts (
    client_id, 
    squad_id, 
    niche_id, 
    account_name, 
    status, 
    risk_level, 
    health_score, 
    start_date, 
    created_at, 
    updated_at
)
SELECT 
    id AS client_id, 
    squad_id, 
    niche_id, 
    name AS account_name, 
    status, 
    risk_level, 
    health_score, 
    start_date, 
    created_at, 
    updated_at
FROM public.clients;
