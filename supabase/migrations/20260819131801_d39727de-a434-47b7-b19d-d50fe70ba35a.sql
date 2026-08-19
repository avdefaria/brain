-- Migração Inicial: Perfis, Squads e Papéis

-- 1. Enum para Papéis
CREATE TYPE public.app_role AS ENUM ('admin', 'leader', 'collaborator');

-- 2. Enum para Funções
CREATE TYPE public.user_function AS ENUM ('Designer', 'Copywriter', 'Gestor de Tráfego', 'Redator', 'Desenvolvedor', 'Administrador');

-- 3. Enum para Vínculos
CREATE TYPE public.employment_type AS ENUM ('CLT', 'PJ', 'Estágio');

-- 4. Tabela de Squads
CREATE TABLE public.squads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.squads TO authenticated;
GRANT ALL ON public.squads TO service_role;
ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;

-- 5. Tabela de Perfis (Profiles)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    function public.user_function NOT NULL DEFAULT 'Designer',
    employment_type public.employment_type NOT NULL DEFAULT 'CLT',
    squad_id UUID REFERENCES public.squads(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT INSERT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 6. Tabela de User Roles (Segurança de Papéis)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL DEFAULT 'collaborator',
    UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 7. Função de segurança para verificar papéis (Security Definer)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies
CREATE POLICY "Qualquer usuário autenticado pode ver squads" ON public.squads
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários podem ver qualquer perfil" ON public.profiles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários podem editar o próprio perfil" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Usuários podem ver os próprios papéis" ON public.user_roles
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER squads_updated_at
    BEFORE UPDATE ON public.squads
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
