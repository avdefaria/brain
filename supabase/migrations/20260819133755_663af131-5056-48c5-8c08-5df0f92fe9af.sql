-- 1. Enums para Projetos e Tarefas
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE public.task_stage AS ENUM ('todo', 'doing', 'review', 'done');

-- 2. Tabela de Entregáveis (Project Deliveries)
CREATE TABLE public.project_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    title TEXT NOT NULL,
    target_count INTEGER NOT NULL DEFAULT 1,
    current_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_deliveries TO authenticated;
GRANT ALL ON public.project_deliveries TO service_role;
ALTER TABLE public.project_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see all deliveries" ON public.project_deliveries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can edit deliveries" ON public.project_deliveries FOR ALL TO authenticated USING (true);

-- 3. Tabela de Tarefas (Tasks)
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT, -- Rich text content
    stage public.task_stage NOT NULL DEFAULT 'todo',
    priority public.task_priority NOT NULL DEFAULT 'medium',
    deadline TIMESTAMPTZ,
    estimated_minutes INTEGER DEFAULT 0,
    actual_minutes INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see all tasks" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can edit tasks" ON public.tasks FOR ALL TO authenticated USING (true);

-- 4. Tabela de Responsáveis por Tarefa
CREATE TABLE public.task_assignees (
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_assignees TO authenticated;
GRANT ALL ON public.task_assignees TO service_role;
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see assignees" ON public.task_assignees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage assignees" ON public.task_assignees FOR ALL TO authenticated USING (true);

-- 5. Comentários da Tarefa
CREATE TABLE public.task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_comments TO authenticated;
GRANT ALL ON public.task_comments TO service_role;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see comments" ON public.task_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can add comments" ON public.task_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 6. Anexos da Tarefa
CREATE TABLE public.task_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    content_type TEXT,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_attachments TO authenticated;
GRANT ALL ON public.task_attachments TO service_role;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see attachments" ON public.task_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage attachments" ON public.task_attachments FOR ALL TO authenticated USING (true);

-- 7. Histórico de Atividade
CREATE TABLE public.task_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT ON public.task_activity TO authenticated;
GRANT ALL ON public.task_activity TO service_role;
ALTER TABLE public.task_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see activity" ON public.task_activity FOR SELECT TO authenticated USING (true);

-- 8. Triggers para updated_at
CREATE TRIGGER project_deliveries_updated_at BEFORE UPDATE ON public.project_deliveries FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();