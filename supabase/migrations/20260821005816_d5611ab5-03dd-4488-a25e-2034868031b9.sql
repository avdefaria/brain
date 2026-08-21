-- Fix linter issue: set search_path
CREATE OR REPLACE FUNCTION public.update_leads_last_contact()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_contact_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- Verify columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'leads' AND column_name = 'last_contact_at';

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
