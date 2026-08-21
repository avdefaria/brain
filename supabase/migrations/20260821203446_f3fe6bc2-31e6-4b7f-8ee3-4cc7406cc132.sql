-- Step 1: Add missing columns to contracts if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'start_date') THEN
        ALTER TABLE public.contracts ADD COLUMN start_date date;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'payment_method') THEN
        ALTER TABLE public.contracts ADD COLUMN payment_method text;
    END IF;
END $$;

-- Step 2: Create receivables table
CREATE TABLE IF NOT EXISTS public.receivables (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
    amount numeric NOT NULL,
    due_date date NOT NULL,
    installment_number integer,
    status text NOT NULL DEFAULT 'pendente',
    paid_at timestamp with time zone,
    payment_method text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Step 3: Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.receivables TO authenticated;
GRANT ALL ON public.receivables TO service_role;

-- Step 4: RLS
ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access receivables of their clients"
ON public.receivables
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients 
    WHERE clients.id = receivables.client_id
  )
);

-- Note: The logic for "atrasado" will be handled in the application layer 
-- as requested: "atrasado" = due_date < hoje E status ainda não é "pago"
