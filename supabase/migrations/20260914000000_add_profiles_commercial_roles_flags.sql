-- Migration: adiciona commercial_roles, must_change_password e active em public.profiles
-- Idempotente: pode ser rodada mais de uma vez no SQL Editor sem erro.
-- Nenhuma tabela nova criada, portanto nenhuma policy RLS nova necessaria
-- (RLS existente de public.profiles continua valendo; service_role mantem ALL).

-- 1. commercial_roles: array de texto, nullable (valores esperados: SDR, Closer, Dono, Gestor)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS commercial_roles TEXT[];

-- 2. must_change_password: boolean, default true, nullable
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT TRUE;

-- 3. active: boolean, default true, nullable
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

-- 4. Garante defaults para inserts futuros (idempotente)
ALTER TABLE public.profiles ALTER COLUMN must_change_password SET DEFAULT TRUE;
ALTER TABLE public.profiles ALTER COLUMN active SET DEFAULT TRUE;

-- 5. Backfill: garante que linhas existentes sem valor fiquem como TRUE
-- (so preenche onde esta NULL, nao altera valores ja definidos como FALSE)
UPDATE public.profiles SET must_change_password = TRUE WHERE must_change_password IS NULL;
UPDATE public.profiles SET active = TRUE WHERE active IS NULL;

-- 6. Documentacao das colunas (idempotente via DO block)
DO $$
BEGIN
  EXECUTE 'COMMENT ON COLUMN public.profiles.commercial_roles IS ''Papeis comerciais (multi-valor): SDR, Closer, Dono, Gestor. Nullable. Nao reaproveita a coluna function.''';
  EXECUTE 'COMMENT ON COLUMN public.profiles.must_change_password IS ''TRUE exige troca de senha no proximo login. Default TRUE.''';
  EXECUTE 'COMMENT ON COLUMN public.profiles.active IS ''FALSE desativa o colaborador sem excluir. Default TRUE.''';
EXCEPTION WHEN OTHERS THEN
  NULL;
END
$$;
