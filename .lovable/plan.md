# Plano de Implementação - Sistema Brain (Agência Ongo)

Etapa 1: Autenticação, Gestão de Usuários, Dashboard e Onboarding.

## Identidade Visual (Ongo Branding)
- Cores: Indigo (#3D4FE8), Ink (#0E0E16), Paper (#F7F8FC), Slate (#8A8FA3, #E4E6F0).
- Fontes: Sora (Títulos), Plus Jakarta Sans (Interface).
- Elementos: Formato de cápsula (pill) para badges, indicadores e toggles.

## Backend (Lovable Cloud / Supabase)
Tabelas iniciais:
- `public.profiles`: Extensão de `auth.users` (nome, foto, função, vínculo, squad_id).
- `public.squads`: Definição de times e líderes.
- `public.roles`: Papéis (Administrador, Líder, Colaborador).

## Funcionalidades
1. **Autenticação**:
   - Página de Login (Email/Senha + Google).
   - Redirecionamento pós-login.
2. **Gestão de Usuários**:
   - Listagem de colaboradores com filtros (squad, função).
   - Cadastro/Edição (apenas Admin).
   - Gestão de Squads.
3. **Dashboard (Início)**:
   - Layout com Sidebar (recolhível) e Header (busca, notificações, avatar).
   - KPIs: Clientes, Health Score, LTV.
   - Listas: Avisos, Tarefas, Agendas, Membros Ativos.
   - Gráficos: LTV e Health Score (dados mockados para esta etapa).
4. **Onboarding**:
   - Modal de boas-vindas com 3 passos (Squad -> Colaborador -> Cliente).

## Detalhes Técnicos
- Framework: TanStack Start v1.
- Estilização: Tailwind CSS v4 (usando tokens semânticos).
- Componentes: Shadcn UI adaptado para o branding Ongo.
- RLS: Políticas de segurança para perfis e squads.
