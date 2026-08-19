-- 1. Ensure columns exist (the previous migration might have partially applied or failed type gen)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contracts' AND column_name='account_id') THEN
        ALTER TABLE public.contracts ADD COLUMN account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='account_id') THEN
        ALTER TABLE public.tasks ADD COLUMN account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Populate contracts.account_id based on client_id
UPDATE public.contracts c
SET account_id = a.id
FROM public.accounts a
WHERE c.client_id = a.client_id
AND c.account_id IS NULL;

-- 3. Populate tasks.account_id based on client_id
UPDATE public.tasks t
SET account_id = a.id
FROM public.accounts a
WHERE t.client_id = a.client_id
AND t.account_id IS NULL;
