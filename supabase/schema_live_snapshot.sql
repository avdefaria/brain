-- ============================================================================
-- SNAPSHOT DO SCHEMA AO VIVO (projeto Lovable Cloud mwuynnhkymchyzbakcyv)
-- Extraído via MCP do Lovable (query_database) em 2026-09-16, direto do
-- information_schema / pg_catalog do banco em produção — NÃO reconstruído
-- a partir das migrations em supabase/migrations/ (essas estão desatualizadas
-- em relação ao banco real: faltam pelo menos a tabela job_functions e a
-- coluna profiles.job_function_id, que não têm migration correspondente).
--
-- STATUS: rascunho de trabalho. Faltando ainda (bloqueado por timeout do MCP
-- do Lovable no momento da extração):
--   - Contagem de linhas por tabela / dump de dados
--   - Policies de storage.objects (bucket task-attachments) confirmadas ao
--     vivo (as 3 abaixo são inferidas do histórico de migrations, que teve
--     idas e vindas — precisa reconfirmar via pg_policies schemaname='storage')
--   - auth schema settings (não relevante pra novo projeto: usuários serão
--     recriados do zero, decisão já tomada)
-- ============================================================================

-- ---------- EXTENSIONS ----------
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid(), gen_random_bytes()

-- ---------- SCHEMAS ----------
CREATE SCHEMA IF NOT EXISTS private;

-- ---------- ENUMS ----------
CREATE TYPE public.app_role AS ENUM ('admin', 'leader', 'collaborator');
CREATE TYPE public.client_status AS ENUM ('active', 'inactive', 'churn');
CREATE TYPE public.content_status AS ENUM (
  'internally_approved', 'client_approved', 'internal_changes_requested',
  'client_changes_requested', 'pending_internal_approval'
);
CREATE TYPE public.contract_type AS ENUM ('recurring', 'one-off');
CREATE TYPE public.employment_type AS ENUM ('CLT', 'PJ', 'Estágio');
CREATE TYPE public.funnel_stage AS ENUM ('attraction', 'education', 'conversion');
CREATE TYPE public.payable_status AS ENUM ('pendente', 'pago', 'atrasado');
CREATE TYPE public.risk_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE public.task_stage AS ENUM ('todo', 'doing', 'review', 'done');
CREATE TYPE public.user_function AS ENUM (
  'Designer', 'Copywriter', 'Gestor de Tráfego', 'Redator', 'Desenvolvedor', 'Administrador'
);

-- ---------- TABLES ----------

CREATE TABLE public.squads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  color text DEFAULT '#3D4FE8',
  leader_id uuid REFERENCES auth.users(id)
);

CREATE TABLE public.job_functions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  avatar_url text,
  function public.user_function NOT NULL DEFAULT 'Designer',
  employment_type public.employment_type NOT NULL DEFAULT 'CLT',
  squad_id uuid REFERENCES public.squads(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  birth_date date,
  commercial_roles text[],
  must_change_password boolean DEFAULT true,
  active boolean DEFAULT true,
  job_function_id uuid REFERENCES public.job_functions(id) ON DELETE SET NULL
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'collaborator',
  UNIQUE (user_id, role)
);

CREATE TABLE public.niches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.sales_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.funnel_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.churn_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company text,
  email text,
  phone text,
  recurring_revenue numeric DEFAULT 0,
  one_time_revenue numeric DEFAULT 0,
  expected_close_date date,
  responsible_id uuid REFERENCES public.profiles(id),
  monthly_revenue_range text,
  niche_id uuid REFERENCES public.niches(id),
  origin text,
  notes text,
  funnel_stage text DEFAULT 'novos_leads',
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  mrr_months integer DEFAULT 1,
  last_contact_at timestamptz,
  funnel_type_id uuid REFERENCES public.funnel_types(id) ON DELETE SET NULL,
  converted_at timestamptz
);

CREATE TABLE public.lead_sales_channels (
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  sales_channel_id uuid REFERENCES public.sales_channels(id) ON DELETE CASCADE,
  PRIMARY KEY (lead_id, sales_channel_id)
);

CREATE TABLE public.lead_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  stage text NOT NULL,
  entered_at timestamptz NOT NULL DEFAULT now(),
  exited_at timestamptz
);
CREATE INDEX idx_lead_stage_history_lead_id ON public.lead_stage_history(lead_id);

CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cnpj_cpf text,
  address text,
  country text DEFAULT 'Brasil',
  state text,
  city text,
  corporate_email text,
  contact_name text,
  contact_whatsapp text,
  squad_id uuid REFERENCES public.squads(id) ON DELETE SET NULL,
  segment text,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date_expected date,
  scope_details text,
  extra_comments text,
  health_score integer DEFAULT 100 CHECK (health_score >= 0 AND health_score <= 100),
  status public.client_status DEFAULT 'active',
  risk_level public.risk_level DEFAULT 'low',
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  sales_channels text[] DEFAULT '{}',
  niche_id uuid REFERENCES public.niches(id),
  lead_id uuid REFERENCES public.leads(id),
  cancelled_at timestamptz,
  churn_reason_id uuid REFERENCES public.churn_reasons(id)
);

CREATE TABLE public.client_sales_channels (
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  sales_channel_id uuid REFERENCES public.sales_channels(id) ON DELETE CASCADE,
  PRIMARY KEY (client_id, sales_channel_id)
);

CREATE TABLE public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  squad_id uuid REFERENCES public.squads(id),
  niche_id uuid REFERENCES public.niches(id),
  sales_channel_id uuid,
  account_name text,
  status public.client_status,
  risk_level public.risk_level,
  health_score integer,
  start_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.account_squads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  squad_id uuid NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (account_id, squad_id)
);

CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  contract_number text UNIQUE,
  type public.contract_type NOT NULL DEFAULT 'recurring',
  monthly_value numeric(12,2) DEFAULT 0.00,
  total_value numeric(12,2) DEFAULT 0.00,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  renewal_date date,
  auto_renewal boolean DEFAULT true,
  status text DEFAULT 'active',
  payment_method text,
  payment_day integer CHECK (payment_day >= 1 AND payment_day <= 31),
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  mrr_months integer
);

CREATE TABLE public.client_public_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.content_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  caption text,
  scheduled_at timestamptz NOT NULL,
  status public.content_status DEFAULT 'pending_internal_approval',
  funnel_stage public.funnel_stage,
  media_urls text[] DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.content_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.content_posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  author_name text,
  content text NOT NULL,
  is_internal boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.company_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  date date NOT NULL,
  type text NOT NULL CHECK (type IN ('event', 'commercial', 'internal')),
  repeat_annually boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.special_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  squad_id uuid REFERENCES public.squads(id) ON DELETE SET NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  description text,
  color text DEFAULT '#3D4FE8',
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.security_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  details jsonb,
  error_message text
);

CREATE TABLE public.deliverable_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_custom boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.project_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  year integer NOT NULL,
  title text NOT NULL,
  target_count integer NOT NULL DEFAULT 1,
  current_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE
);

CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  stage public.task_stage NOT NULL DEFAULT 'todo',
  priority public.task_priority NOT NULL DEFAULT 'medium',
  deadline timestamptz,
  estimated_minutes integer DEFAULT 0,
  actual_minutes integer DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  position integer DEFAULT 0,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  deliverable_type_id uuid REFERENCES public.deliverable_types(id),
  sku_reference text,
  time_tracked_seconds integer DEFAULT 0,
  timer_started_at timestamptz
);

CREATE TABLE public.task_assignees (
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, user_id)
);

CREATE TABLE public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  content_type text,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.task_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.task_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  changes jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.task_tags (
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

CREATE TABLE public.expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.payables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  category_id uuid REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  status public.payable_status NOT NULL DEFAULT 'pendente',
  paid_at timestamptz,
  payment_method text,
  supplier_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_payables_category_id ON public.payables(category_id);
CREATE INDEX idx_payables_due_date ON public.payables(due_date);
CREATE INDEX idx_payables_status ON public.payables(status);

CREATE TABLE public.revenue_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.receivables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  due_date date NOT NULL,
  installment_number integer,
  status text NOT NULL DEFAULT 'pendente',
  paid_at timestamptz,
  payment_method text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  category_id uuid REFERENCES public.revenue_categories(id) ON DELETE SET NULL,
  client_name text,
  description text
);
CREATE INDEX idx_receivables_category_id ON public.receivables(category_id);

CREATE TABLE public.commercial_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  year integer NOT NULL CHECK (year >= 2000 AND year <= 2100),
  leads_target integer NOT NULL DEFAULT 0 CHECK (leads_target >= 0),
  proposals_target integer NOT NULL DEFAULT 0 CHECK (proposals_target >= 0),
  deals_target integer NOT NULL DEFAULT 0 CHECK (deals_target >= 0),
  revenue_target numeric NOT NULL DEFAULT 0 CHECK (revenue_target >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (month, year)
);
CREATE INDEX idx_commercial_goals_month_year ON public.commercial_goals(month, year);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$function$;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_leads_last_contact()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  NEW.last_contact_at = now();
  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.update_leads_last_contact() FROM PUBLIC, authenticated, anon;

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, function, employment_type)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    CASE WHEN (SELECT count(*) FROM public.user_roles WHERE role = 'admin') = 0 THEN 'Administrador'::public.user_function ELSE 'Designer'::public.user_function END,
    'PJ'
  );
  RETURN new;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_profile() FROM PUBLIC, authenticated, anon;

CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
    IF (SELECT count(*) FROM public.user_roles) = 0 THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (new.id, 'admin');
    ELSE
        INSERT INTO public.user_roles (user_id, role)
        VALUES (new.id, 'collaborator');
    END IF;
    RETURN new;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM PUBLIC, authenticated, anon;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER tr_leads_last_contact BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_leads_last_contact();

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER project_deliveries_updated_at BEFORE UPDATE ON public.project_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER squads_updated_at BEFORE UPDATE ON public.squads
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Estes dois disparam em auth.users — recriar no projeto novo para que
-- signup crie profile+role automaticamente (1º usuário criado vira admin):
CREATE TRIGGER on_auth_user_created_profile AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

CREATE TRIGGER on_auth_user_created_role AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- ============================================================================
-- STORAGE
-- ============================================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('task-attachments', 'task-attachments', false);

-- Inferido do histórico de migrations (RECONFIRMAR ao vivo antes de aplicar):
CREATE POLICY "Allow authenticated uploads" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'task-attachments');
CREATE POLICY "Allow authenticated reads on task attachments" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'task-attachments');
CREATE POLICY "Allow authenticated deletes" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'task-attachments');

-- ============================================================================
-- RLS: habilitar em todas as tabelas
-- ============================================================================
ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_functions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.niches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.churn_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_sales_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_sales_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_public_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliverable_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_goals ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES (extraídas ao vivo de pg_policies — texto exato de qual/with_check)
-- ============================================================================

CREATE POLICY "Allow all for authenticated users" ON public.account_squads FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Staff can read accounts" ON public.accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can insert accounts" ON public.accounts FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'leader'));
CREATE POLICY "Managers can update accounts" ON public.accounts FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'leader')) WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'leader'));
CREATE POLICY "Managers can delete accounts" ON public.accounts FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'leader'));

CREATE POLICY "Allow authenticated to select churn_reasons" ON public.churn_reasons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated to insert churn_reasons" ON public.churn_reasons FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins can manage access tokens" ON public.client_public_access FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Allow all for authenticated users" ON public.client_sales_channels FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Staff can read clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can write clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'leader'));
CREATE POLICY "Managers can update clients" ON public.clients FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'leader')) WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'leader'));
CREATE POLICY "Managers can delete clients" ON public.clients FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'leader'));

CREATE POLICY "Authenticated can select commercial goals" ON public.commercial_goals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert commercial goals" ON public.commercial_goals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update commercial goals" ON public.commercial_goals FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete commercial goals" ON public.commercial_goals FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read events" ON public.company_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage events" ON public.company_events FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Team can read comments" ON public.content_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team can insert own comments" ON public.content_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND char_length(content) BETWEEN 1 AND 5000);
CREATE POLICY "Team can update own comments" ON public.content_comments FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Team can delete own comments or admins" ON public.content_comments FOR DELETE TO authenticated USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public can read external comments" ON public.content_comments FOR SELECT TO anon USING (is_internal = false);
CREATE POLICY "Public can insert external comments" ON public.content_comments FOR INSERT TO anon WITH CHECK (is_internal = false AND user_id IS NULL AND author_name IS NOT NULL AND char_length(author_name) BETWEEN 1 AND 100 AND char_length(content) BETWEEN 1 AND 5000);

CREATE POLICY "Allow authenticated to manage posts" ON public.content_posts FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow public read of posts for client" ON public.content_posts FOR SELECT TO anon USING (true);

CREATE POLICY "Staff can read contracts" ON public.contracts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can insert contracts" ON public.contracts FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'leader'));
CREATE POLICY "Managers can update contracts" ON public.contracts FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'leader')) WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'leader'));
CREATE POLICY "Managers can delete contracts" ON public.contracts FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'leader'));

CREATE POLICY "Allow authenticated users to select deliverable types" ON public.deliverable_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert deliverable types" ON public.deliverable_types FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can select expense categories" ON public.expense_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert expense categories" ON public.expense_categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update expense categories" ON public.expense_categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete expense categories" ON public.expense_categories FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can see funnel types" ON public.funnel_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert funnel types" ON public.funnel_types FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable delete for authenticated users" ON public.funnel_types FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated can select job functions" ON public.job_functions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert job functions" ON public.job_functions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update job functions" ON public.job_functions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete job functions" ON public.job_functions FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage lead sales channels" ON public.lead_sales_channels FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can select lead stage history" ON public.lead_stage_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert lead stage history" ON public.lead_stage_history FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update lead stage history" ON public.lead_stage_history FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can select leads" ON public.leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update leads" ON public.leads FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete leads" ON public.leads FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow select for all authenticated users" ON public.niches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert for all authenticated users" ON public.niches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users on niches" ON public.niches FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can select payables" ON public.payables FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert payables" ON public.payables FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update payables" ON public.payables FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete payables" ON public.payables FOR DELETE TO authenticated USING (true);

CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
REVOKE SELECT (employment_type) ON public.profiles FROM authenticated;
REVOKE UPDATE (employment_type) ON public.profiles FROM authenticated;

CREATE POLICY "Users can see all deliveries" ON public.project_deliveries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can edit deliveries" ON public.project_deliveries FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can access receivables of their clients" ON public.receivables FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.clients WHERE clients.id = receivables.client_id));
CREATE POLICY "Authenticated can manage one-off receivables" ON public.receivables FOR ALL TO authenticated USING (client_id IS NULL) WITH CHECK (client_id IS NULL);

CREATE POLICY "Authenticated can select revenue categories" ON public.revenue_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert revenue categories" ON public.revenue_categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update revenue categories" ON public.revenue_categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete revenue categories" ON public.revenue_categories FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow select for all authenticated users" ON public.sales_channels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert for all authenticated users" ON public.sales_channels FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users on sales_channels" ON public.sales_channels FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Users can only insert their own logs" ON public.security_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all logs" ON public.security_logs FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can read special projects" ON public.special_projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage special projects" ON public.special_projects FOR ALL TO authenticated USING (true);

CREATE POLICY "Usuários podem ver squads associados" ON public.squads FOR SELECT TO authenticated USING (
  leader_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.squad_id = squads.id)
  OR private.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Admins ou líderes podem inserir squads" ON public.squads FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin') OR leader_id = auth.uid());
CREATE POLICY "Admins ou líderes podem atualizar squads" ON public.squads FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin') OR leader_id = auth.uid()) WITH CHECK (private.has_role(auth.uid(), 'admin') OR leader_id = auth.uid());
CREATE POLICY "Apenas admins podem deletar squads" ON public.squads FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can select tags" ON public.tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert tags" ON public.tags FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can see activity" ON public.task_activity FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can see assignees" ON public.task_assignees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage assignees" ON public.task_assignees FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users can see task assignees" ON public.task_assignees FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can see attachments" ON public.task_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage attachments" ON public.task_attachments FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can see comments" ON public.task_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can add comments" ON public.task_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view history of tasks they can see" ON public.task_history FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_history.task_id));
CREATE POLICY "Users can insert history for tasks" ON public.task_history FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can select task_tags" ON public.task_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert task_tags" ON public.task_tags FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete task_tags" ON public.task_tags FOR DELETE TO authenticated USING (true);

CREATE POLICY "Users can see all tasks" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can edit tasks" ON public.tasks FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can see their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can see all roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- GRANTS (baseline — authenticated precisa de CRUD, service_role de ALL;
-- alguns casos pontuais de GRANT SELECT a anon ficaram registrados nas
-- migrations e foram preservados aqui)
-- ============================================================================
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON public.niches, public.sales_channels, public.funnel_types, public.churn_reasons TO anon;
GRANT SELECT, INSERT ON public.content_posts TO anon;
GRANT SELECT, INSERT ON public.content_comments TO anon;
