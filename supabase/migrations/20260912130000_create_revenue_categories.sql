-- One-off receivables: revenue_categories catalog + receivables new columns
CREATE TABLE IF NOT EXISTS public.revenue_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

INSERT INTO public.revenue_categories (name)
VALUES ('Consultoria'), ('Outras Receitas'), ('Rendimentos'), ('Comissões de Afiliados')
ON CONFLICT (name) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'receivables' AND column_name = 'category_id') THEN
    ALTER TABLE public.receivables ADD COLUMN category_id uuid REFERENCES public.revenue_categories(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'receivables' AND column_name = 'client_name') THEN
    ALTER TABLE public.receivables ADD COLUMN client_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'receivables' AND column_name = 'description') THEN
    ALTER TABLE public.receivables ADD COLUMN description text;
  END IF;
END $$;

-- Allow receivables without linked client (simplified client)
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.receivables ALTER COLUMN client_id DROP NOT NULL;
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;

CREATE INDEX IF NOT EXISTS idx_receivables_category_id ON public.receivables(category_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.revenue_categories TO authenticated;
GRANT ALL ON public.revenue_categories TO service_role;

ALTER TABLE public.revenue_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can select revenue categories" ON public.revenue_categories;
CREATE POLICY "Authenticated can select revenue categories" ON public.revenue_categories FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated can insert revenue categories" ON public.revenue_categories;
CREATE POLICY "Authenticated can insert revenue categories" ON public.revenue_categories FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated can update revenue categories" ON public.revenue_categories;
CREATE POLICY "Authenticated can update revenue categories" ON public.revenue_categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated can delete revenue categories" ON public.revenue_categories;
CREATE POLICY "Authenticated can delete revenue categories" ON public.revenue_categories FOR DELETE TO authenticated USING (true);

-- Allow one-off receivables (client_id IS NULL) under existing RLS
DROP POLICY IF EXISTS "Authenticated can manage one-off receivables" ON public.receivables;
CREATE POLICY "Authenticated can manage one-off receivables" ON public.receivables FOR ALL TO authenticated USING (client_id IS NULL) WITH CHECK (client_id IS NULL);
