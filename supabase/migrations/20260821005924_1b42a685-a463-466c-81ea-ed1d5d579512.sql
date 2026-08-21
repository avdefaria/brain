-- Test trigger update by performing a dummy update on a lead
UPDATE public.leads SET notes = COALESCE(notes, '') WHERE id = (SELECT id FROM public.leads LIMIT 1);
SELECT id, last_contact_at FROM public.leads WHERE id = (SELECT id FROM public.leads LIMIT 1);
