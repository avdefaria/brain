-- 1. Remove unused duplicated SECURITY DEFINER admin helper
DROP POLICY IF EXISTS "Admins can see all roles" ON public.user_roles;
CREATE POLICY "Admins can see all roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
DROP FUNCTION IF EXISTS public.check_is_admin(uuid);

-- 2. content_comments: prevent anon spoofing
DROP POLICY IF EXISTS "Allow public insert of comments for client" ON public.content_comments;
DROP POLICY IF EXISTS "Allow public read of comments for client" ON public.content_comments;
DROP POLICY IF EXISTS "Allow authenticated to manage comments" ON public.content_comments;

CREATE POLICY "Public can read external comments"
ON public.content_comments FOR SELECT TO anon
USING (is_internal = false);

CREATE POLICY "Public can insert external comments"
ON public.content_comments FOR INSERT TO anon
WITH CHECK (
  is_internal = false
  AND user_id IS NULL
  AND author_name IS NOT NULL
  AND char_length(author_name) BETWEEN 1 AND 100
  AND char_length(content) BETWEEN 1 AND 5000
);

CREATE POLICY "Team can read comments"
ON public.content_comments FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Team can insert own comments"
ON public.content_comments FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND char_length(content) BETWEEN 1 AND 5000
);

CREATE POLICY "Team can update own comments"
ON public.content_comments FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Team can delete own comments or admins"
ON public.content_comments FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 3. clients / accounts / contracts: reads for staff, writes for admin/leader
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.clients;
DROP POLICY IF EXISTS "Allow all for authenticated users on clients" ON public.clients;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.accounts;
DROP POLICY IF EXISTS "Authenticated users can insert contracts" ON public.contracts;
DROP POLICY IF EXISTS "Authenticated users can update contracts" ON public.contracts;
DROP POLICY IF EXISTS "Authenticated users can select contracts" ON public.contracts;

CREATE POLICY "Staff can read clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can write clients" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'leader'));
CREATE POLICY "Managers can update clients" ON public.clients FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'leader'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'leader'));
CREATE POLICY "Managers can delete clients" ON public.clients FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'leader'));

CREATE POLICY "Staff can read accounts" ON public.accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can insert accounts" ON public.accounts FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'leader'));
CREATE POLICY "Managers can update accounts" ON public.accounts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'leader'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'leader'));
CREATE POLICY "Managers can delete accounts" ON public.accounts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'leader'));

CREATE POLICY "Staff can read contracts" ON public.contracts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can insert contracts" ON public.contracts FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'leader'));
CREATE POLICY "Managers can update contracts" ON public.contracts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'leader'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'leader'));
CREATE POLICY "Managers can delete contracts" ON public.contracts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'leader'));

-- 4. profiles: hide sensitive employment data from regular reads
REVOKE SELECT (employment_type) ON public.profiles FROM authenticated;
REVOKE UPDATE (employment_type) ON public.profiles FROM authenticated;
