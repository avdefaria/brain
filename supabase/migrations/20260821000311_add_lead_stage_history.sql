-- Create lead_stage_history table
CREATE TABLE IF NOT EXISTS public.lead_stage_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    stage TEXT NOT NULL,
    entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    exited_at TIMESTAMPTZ
);

-- Grants
GRANT SELECT, INSERT ON public.lead_stage_history TO authenticated;
GRANT ALL ON public.lead_stage_history TO service_role;

-- Enable RLS
ALTER TABLE public.lead_stage_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can select their own lead stage history" ON public.lead_stage_history;
CREATE POLICY "Users can select their own lead stage history"
    ON public.lead_stage_history
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can insert lead stage history" ON public.lead_stage_history;
CREATE POLICY "Users can insert lead stage history"
    ON public.lead_stage_history
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Insert initial stage for existing leads
INSERT INTO public.lead_stage_history (lead_id, stage, entered_at)
SELECT id, funnel_stage, created_at
FROM public.leads
WHERE id NOT IN (SELECT lead_id FROM public.lead_stage_history);
