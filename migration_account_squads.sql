-- 1. Crie a tabela account_squads
CREATE TABLE IF NOT EXISTS public.account_squads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    squad_id uuid NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    UNIQUE(account_id, squad_id)
);

-- 2. Habilite RLS e aplique permissões
ALTER TABLE public.account_squads ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.account_squads TO authenticated;
GRANT ALL ON public.account_squads TO service_role;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'account_squads' AND policyname = 'Allow all for authenticated users'
    ) THEN
        CREATE POLICY "Allow all for authenticated users" ON public.account_squads
        FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 3. Popule account_squads a partir de accounts
INSERT INTO public.account_squads (account_id, squad_id)
SELECT id, squad_id
FROM public.accounts
WHERE squad_id IS NOT NULL
ON CONFLICT (account_id, squad_id) DO NOTHING;

-- 5. Verificação de contagem
SELECT 'accounts_with_squad' as label, count(*) FROM public.accounts WHERE squad_id IS NOT NULL
UNION ALL
SELECT 'account_squads_rows' as label, count(*) FROM public.account_squads;

-- 6. Resultado completo
SELECT * FROM public.account_squads;
