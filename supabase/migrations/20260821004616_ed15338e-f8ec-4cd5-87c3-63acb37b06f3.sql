CREATE TABLE IF NOT EXISTS public.lead_stage_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    stage TEXT NOT NULL,
    entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    exited_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_lead_stage_history_lead_id ON public.lead_stage_history(lead_id);

GRANT SELECT, INSERT, UPDATE ON public.lead_stage_history TO authenticated;
GRANT ALL ON public.lead_stage_history TO service_role;

ALTER TABLE public.lead_stage_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can select lead stage history" ON public.lead_stage_history;
CREATE POLICY "Authenticated users can select lead stage history"
    ON public.lead_stage_history FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert lead stage history" ON public.lead_stage_history;
CREATE POLICY "Authenticated users can insert lead stage history"
    ON public.lead_stage_history FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update lead stage history" ON public.lead_stage_history;
CREATE POLICY "Authenticated users can update lead stage history"
    ON public.lead_stage_history FOR UPDATE TO authenticated USING (true);

INSERT INTO public.lead_stage_history (lead_id, stage, entered_at)
SELECT l.id, COALESCE(l.funnel_stage, 'novos_leads'), COALESCE(l.created_at, now())
FROM public.leads l
WHERE NOT EXISTS (
  SELECT 1 FROM public.lead_stage_history h WHERE h.lead_id = l.id
);