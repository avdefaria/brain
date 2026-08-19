-- 1. Remover policies atuais da tabela squads para isolamento por conta
DROP POLICY IF EXISTS "Usuários autenticados podem ver squads" ON public.squads;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir squads" ON public.squads;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar squads" ON public.squads;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar squads" ON public.squads;

-- 2. Criar policies baseadas em posse ou associação
-- SELECT: Usuários podem ver squads que lideram ou squads onde estão alocados
CREATE POLICY "Usuários podem ver squads associados" 
ON public.squads FOR SELECT 
TO authenticated 
USING (
    leader_id = auth.uid() 
    OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND squad_id = squads.id
    )
    OR
    public.has_role(auth.uid(), 'admin')
);

-- INSERT: Apenas admins podem criar squads, ou líderes (se o leader_id for o próprio usuário)
CREATE POLICY "Admins ou líderes podem inserir squads" 
ON public.squads FOR INSERT 
TO authenticated 
WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR
    leader_id = auth.uid()
);

-- UPDATE: Apenas admins ou o líder do squad podem atualizar
CREATE POLICY "Admins ou líderes podem atualizar squads" 
ON public.squads FOR UPDATE 
TO authenticated 
USING (
    public.has_role(auth.uid(), 'admin')
    OR
    leader_id = auth.uid()
)
WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR
    leader_id = auth.uid()
);

-- DELETE: Apenas admins podem deletar squads
CREATE POLICY "Apenas admins podem deletar squads" 
ON public.squads FOR DELETE 
TO authenticated 
USING (
    public.has_role(auth.uid(), 'admin')
);
