ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_contact_at timestamp with time zone;

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;

-- Function to update last_contact_at
CREATE OR REPLACE FUNCTION public.update_leads_last_contact()
RETURNS TRIGGER AS $$
BEGIN
  -- Update last_contact_at to now() on any change
  NEW.last_contact_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for lead changes (edit or notes update)
DROP TRIGGER IF EXISTS tr_leads_last_contact ON public.leads;
CREATE TRIGGER tr_leads_last_contact
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_leads_last_contact();

-- Update existing leads to have a default value
UPDATE public.leads SET last_contact_at = now() WHERE last_contact_at IS NULL;
