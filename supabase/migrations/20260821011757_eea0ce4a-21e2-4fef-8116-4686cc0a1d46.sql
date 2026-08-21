
-- Grant INSERT to authenticated users on funnel_types
GRANT INSERT ON public.funnel_types TO authenticated;

-- Enable RLS and add policy for INSERT
ALTER TABLE public.funnel_types ENABLE ROW LEVEL SECURITY;

-- Remove duplicate policy if it exists and recreate
DROP POLICY IF EXISTS "Authenticated users can insert funnel types" ON public.funnel_types;
CREATE POLICY "Authenticated users can insert funnel types"
ON public.funnel_types
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Ensure SELECT policy exists
DROP POLICY IF EXISTS "Authenticated users can select funnel types" ON public.funnel_types;
CREATE POLICY "Authenticated users can select funnel types"
ON public.funnel_types
FOR SELECT
TO authenticated
USING (true);
