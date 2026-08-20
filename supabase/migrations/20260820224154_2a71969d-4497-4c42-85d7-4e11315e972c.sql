CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- user_roles
DROP POLICY IF EXISTS "Admins can see all roles" ON public.user_roles;
CREATE POLICY "Admins can see all roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));

-- company_events
DROP POLICY IF EXISTS "Admins can manage events" ON public.company_events;
CREATE POLICY "Admins can manage events" ON public.company_events FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

-- security_logs
DROP POLICY IF EXISTS "Admins can view all logs" ON public.security_logs;
CREATE POLICY "Admins can view all logs" ON public.security_logs FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

-- client_public_access
DROP POLICY IF EXISTS "Admins can manage access tokens" ON public.client_public_access;
CREATE POLICY "Admins can manage access tokens" ON public.client_public_access FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

-- squads
DROP POLICY IF EXISTS "Usuários podem ver squads associados" ON public.squads;
CREATE POLICY "Usuários podem ver squads associados" ON public.squads FOR SELECT TO authenticated
  USING (
    leader_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.squad_id = squads.id)
    OR private.has_role(auth.uid(), 'admin')
  );
DROP POLICY IF EXISTS "Admins ou líderes podem inserir squads" ON public.squads;
CREATE POLICY "Admins ou líderes podem inserir squads" ON public.squads FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin') OR leader_id = auth.uid());
DROP POLICY IF EXISTS "Admins ou líderes podem atualizar squads" ON public.squads;
CREATE POLICY "Admins ou líderes podem atualizar squads" ON public.squads FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR leader_id = auth.uid())
  WITH CHECK (private.has_role(auth.uid(), 'admin') OR leader_id = auth.uid());
DROP POLICY IF EXISTS "Apenas admins podem deletar squads" ON public.squads;
CREATE POLICY "Apenas admins podem deletar squads" ON public.squads FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

-- content_comments
DROP POLICY IF EXISTS "Team can delete own comments or admins" ON public.content_comments;
CREATE POLICY "Team can delete own comments or admins" ON public.content_comments FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));

-- clients
DROP POLICY IF EXISTS "Managers can write clients" ON public.clients;
CREATE POLICY "Managers can write clients" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'leader'));
DROP POLICY IF EXISTS "Managers can update clients" ON public.clients;
CREATE POLICY "Managers can update clients" ON public.clients FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'leader'))
  WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'leader'));
DROP POLICY IF EXISTS "Managers can delete clients" ON public.clients;
CREATE POLICY "Managers can delete clients" ON public.clients FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'leader'));

-- accounts
DROP POLICY IF EXISTS "Managers can insert accounts" ON public.accounts;
CREATE POLICY "Managers can insert accounts" ON public.accounts FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'leader'));
DROP POLICY IF EXISTS "Managers can update accounts" ON public.accounts;
CREATE POLICY "Managers can update accounts" ON public.accounts FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'leader'))
  WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'leader'));
DROP POLICY IF EXISTS "Managers can delete accounts" ON public.accounts;
CREATE POLICY "Managers can delete accounts" ON public.accounts FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'leader'));

-- contracts
DROP POLICY IF EXISTS "Managers can insert contracts" ON public.contracts;
CREATE POLICY "Managers can insert contracts" ON public.contracts FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'leader'));
DROP POLICY IF EXISTS "Managers can update contracts" ON public.contracts;
CREATE POLICY "Managers can update contracts" ON public.contracts FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'leader'))
  WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'leader'));
DROP POLICY IF EXISTS "Managers can delete contracts" ON public.contracts;
CREATE POLICY "Managers can delete contracts" ON public.contracts FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'leader'));

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
