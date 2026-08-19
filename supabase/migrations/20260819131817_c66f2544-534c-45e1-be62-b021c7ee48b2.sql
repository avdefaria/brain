-- 1. Corrigir permissões da função has_role
-- Revoga execução pública (anon e authenticated)
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM anon, authenticated;

-- Permite apenas para service_role (usado em políticas RLS)
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO service_role;

-- 2. Definir explicitamente o search_path para a função handle_updated_at (Security Best Practice)
ALTER FUNCTION public.handle_updated_at() SET search_path = public;
