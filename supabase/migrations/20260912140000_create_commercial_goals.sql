-- Commercial monthly goals: one goal per month/year
CREATE TABLE IF NOT EXISTS public.commercial_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  year integer NOT NULL CHECK (year >= 2000 AND year <= 2100),
  leads_target integer NOT NULL DEFAULT 0 CHECK (leads_target >= 0),
  proposals_target integer NOT NULL DEFAULT 0 CHECK (proposals_target >= 0),
  deals_target integer NOT NULL DEFAULT 0 CHECK (deals_target >= 0),
  revenue_target numeric NOT NULL DEFAULT 0 CHECK (revenue_target >= 0),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE (month, year)
);

CREATE INDEX IF NOT EXISTS idx_commercial_goals_month_year ON public.commercial_goals(month, year);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.commercial_goals TO authenticated;
GRANT ALL ON public.commercial_goals TO service_role;

ALTER TABLE public.commercial_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can select commercial goals" ON public.commercial_goals;
CREATE POLICY "Authenticated can select commercial goals" ON public.commercial_goals FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated can insert commercial goals" ON public.commercial_goals;
CREATE POLICY "Authenticated can insert commercial goals" ON public.commercial_goals FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated can update commercial goals" ON public.commercial_goals;
CREATE POLICY "Authenticated can update commercial goals" ON public.commercial_goals FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated can delete commercial goals" ON public.commercial_goals;
CREATE POLICY "Authenticated can delete commercial goals" ON public.commercial_goals FOR DELETE TO authenticated USING (true);
