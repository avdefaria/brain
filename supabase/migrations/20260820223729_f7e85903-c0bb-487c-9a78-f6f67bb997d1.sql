-- Storage Policy Remediation
BEGIN;
  DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;
  
  CREATE POLICY "Allow authenticated reads on task attachments" 
  ON storage.objects FOR SELECT 
  TO authenticated 
  USING (bucket_id = 'task-attachments');
COMMIT;

-- client_public_access RLS Hardening
-- This table seems to store tokens for content approval (public.approval.$token).
-- We should restrict SELECT to only the intended use-case or admin roles.
-- Since the approval route likely uses the token to find the record, 
-- and the route itself might be public, we need to be careful.
-- However, the linter flagged "exposed to all authenticated users".
-- Let's restrict it so users can only see tokens they created or for their clients,
-- or just restrict to service_role if the public route uses a server function.

BEGIN;
  DROP POLICY IF EXISTS "Allow authenticated to manage access tokens" ON public.client_public_access;
  
  -- Only allow authenticated users to see tokens for clients they are associated with
  -- Or simpler: Only admins can manage tokens, and the public route uses server logic.
  -- For now, let's restrict it to the user who created it (if we had a user_id) 
  -- or via the has_role('admin') check if that's available.
  
  CREATE POLICY "Admins can manage access tokens" 
  ON public.client_public_access
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

  -- If the public approval route needs to read this, we might need a specific policy for that.
  -- But usually, that should be handled by a security definer function.
COMMIT;