CREATE TABLE public.lead_stage_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    stage TEXT NOT NULL,
    entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    exited_at TIMESTAMPTZ
);

GRANT SELECT, INSERT ON public.lead_stage_history TO authenticated;
GRANT ALL ON public.lead_stage_history TO service_role;

ALTER TABLE public.lead_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select their own lead stage history"
    ON public.lead_stage_history
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can insert lead stage history"
    ON public.lead_stage_history
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Ensure first history record is created for existing leads if needed
-- (Skipping data migration here to keep it clean, focusing on the triggers/functions)
