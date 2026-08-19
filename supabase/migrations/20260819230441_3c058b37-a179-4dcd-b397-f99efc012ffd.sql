-- 1. Alter contracts table to add account_id
ALTER TABLE public.contracts 
ADD COLUMN account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL;

-- 2. Populate contracts.account_id based on client_id
UPDATE public.contracts c
SET account_id = a.id
FROM public.accounts a
WHERE c.client_id = a.client_id;

-- 3. Alter tasks table to add account_id
ALTER TABLE public.tasks 
ADD COLUMN account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL;

-- 4. Populate tasks.account_id based on client_id
UPDATE public.tasks t
SET account_id = a.id
FROM public.accounts a
WHERE t.client_id = a.client_id;
