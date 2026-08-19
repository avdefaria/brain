# Plan: Refactor Home (Dashboard) Screen

The user identified that the Home screen currently mirrors the Clients Overview screen incorrectly. I will rebuild the Home screen (`src/routes/_authenticated.dashboard.tsx`) to follow the specific order and elements requested, while keeping the "Visão Geral da Carteira" as it is.

## User Review Required

> [!IMPORTANT]
> The timeline component will be implemented with local state for navigation (weekly view) as a frontend-first component.

- Does the "Timeline de projetos especiais" need to be linked to a specific database table already, or should I start with mock data based on existing project deliveries? I'll use existing data where possible.

## Proposed Changes

### Dashboard Refactor (`src/routes/_authenticated.dashboard.tsx`)

#### 1. Header & Greeting
- Implement greeting with user name (dynamic from profile).
- Add "Ver perfil" and "Nova solicitação ao RH" buttons in a pill-shaped layout.

#### 2. Top Banner (KPIs & Notices)
- Block of internal notices with "Ver todos os avisos".
- 3 KPI Cards:
  - Clientes no Squad
  - Health Score
  - LTV do Squad (in months)

#### 3. Main Content (Two Columns)
- **Left Column**:
  - "Próximas tarefas": Counter of pending tasks + table (Responsible, Task, Deadline, Priority).
  - "Próximas agendas": List/Calendar view for upcoming meetings.
- **Right Column**:
  - "Membros do squad": Counter of active members + list of avatars/names.

#### 4. Analytics Section
- Two line charts side-by-side:
  - "LTV por mês"
  - "Health score por mês"

#### 5. Special Projects Timeline
- Weekly navigation with arrows.
- Filters: All / My Squad / My Projects.
- Toggle: Week/Month view.
- "Adicionar projeto" button.

### Styling & Identity
- Maintain Ongo Indigo (#3D4FE8), Ink (#0E0E16), Paper (#F7F8FC).
- Use Sora for titles and Plus Jakarta Sans for body text.
- Apply pill-shaped badges and containers.

## Technical Details
- Use `lucide-react` for icons.
- Use `recharts` for the line charts.
- Tasks will be pulled from the `tasks` table via TanStack Query.
- Profile data will be fetched from the authenticated context.
