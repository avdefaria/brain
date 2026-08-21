-- Revoke public execute
REVOKE EXECUTE ON FUNCTION public.update_leads_last_contact() FROM public;
REVOKE EXECUTE ON FUNCTION public.update_leads_last_contact() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_leads_last_contact() FROM anon;

-- Verification of last lead updated (test trigger)
UPDATE public.leads SET notes = COALESCE(notes, '') || ' ' WHERE id = (SELECT id FROM public.leads LIMIT 1);
SELECT id, last_contact_at FROM public.leads WHERE id = (SELECT id FROM public.leads LIMIT 1);
