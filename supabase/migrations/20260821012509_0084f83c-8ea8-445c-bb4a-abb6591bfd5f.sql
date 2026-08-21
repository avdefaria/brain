
-- Add DELETE policy for funnel_types
CREATE POLICY "Enable delete for authenticated users" ON public.funnel_types FOR DELETE TO authenticated USING (true);

-- Ensure GRANTs are up to date for the new functionality
GRANT DELETE ON public.funnel_types TO authenticated;
