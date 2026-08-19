-- 1. Garante que RLS está habilitado
ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;

-- 2. Remove policies existentes para recriar de forma limpa
DROP POLICY IF EXISTS "Qualquer usuário autenticado pode ver squads" ON public.squads;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir squads" ON public.squads;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar squads" ON public.squads;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar squads" ON public.squads;

-- 3. Cria as novas policies
CREATE POLICY "Usuários autenticados podem ver squads" 
ON public.squads FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Usuários autenticados podem inserir squads" 
ON public.squads FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar squads" 
ON public.squads FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem deletar squads" 
ON public.squads FOR DELETE 
TO authenticated 
USING (true);

-- 4. Garante as permissões básicas (GRANTs)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.squads TO authenticated;
GRANT ALL ON public.squads TO service_role;
