-- Create payables module
DO $$ BEGIN
  CREATE TYPE public.payable_status AS ENUM ('pendente', 'pago', 'atrasado');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

INSERT INTO public.expense_categories (name)
VALUES ('Aluguel'), ('Salários'), ('Ferramentas/SaaS'), ('Impostos'), ('Fornecedores'), ('Outros')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.payables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  category_id uuid REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  status public.payable_status NOT NULL DEFAULT 'pendente',
  paid_at timestamp with time zone,
  payment_method text,
  supplier_name text,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payables_category_id ON public.payables(category_id);
CREATE INDEX IF NOT EXISTS idx_payables_due_date ON public.payables(due_date);
CREATE INDEX IF NOT EXISTS idx_payables_status ON public.payables(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payables TO authenticated;
GRANT ALL ON public.expense_categories TO service_role;
GRANT ALL ON public.payables TO service_role;

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can select expense categories" ON public.expense_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert expense categories" ON public.expense_categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update expense categories" ON public.expense_categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete expense categories" ON public.expense_categories FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated can select payables" ON public.payables FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert payables" ON public.payables FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update payables" ON public.payables FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete payables" ON public.payables FOR DELETE TO authenticated USING (true);
