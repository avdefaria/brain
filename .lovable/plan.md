# Plan: Complete Projects Overview Module

Rebuild the Projects Overview screen (`src/routes/_authenticated.projects.tsx`) with real data, squad management, advanced charts, Brazilian holiday calendar, project timeline, and a detailed delivery table.

## User Review Required

> [!IMPORTANT]
> - The Brazilian holidays will be calculated dynamically for any given year.
> - Squad identity colors will be applied to UI elements (cards, badges, progress bars).

## Proposed Changes

### Database & Backend
- Use existing `squads`, `tasks`, `clients`, `profiles`, and `project_deliveries` tables.
- Implement `getProjectsOverviewData` in `src/lib/projects.functions.ts` to fetch all necessary metrics.
- Add `updateSquad` and `deleteSquad` functions for the new management features.

### UI Components
#### 1. Squad Cards & Management
- Add a 3-dot action menu to cards.
- Create `SquadManagementDialog` for editing (name, leader, color palette).
- Implement a color palette of 9 Ongo-consistent colors (#3D4FE8, #22C55E, #F5A524, #EF4444, #8B5CF6, #EC4899, #06B6D4, #F97316, #64748B).
- Add deletion confirmation with a warning about linked data.

#### 2. KPI Cards (Top Section)
- **Planejamentos gerais**: Real progress X/Y with badge and full-width bar.
- **Tarefas gerais**: Real tasks in progress stats.
- **Contas por Squad**: Vertical bar chart showing client distribution per squad using Recharts.

#### 3. New Sections
- **Calendar & Next Dates**:
  - Left: Monthly calendar with navigation and today highlighting.
  - Right: Holiday/Events list (Brazilian national holidays like Carnaval, Easter, etc. calculated dynamically).
- **Project Timeline**:
  - Horizontal ruler by day/week.
  - Filterable by squad/my projects.
  - "Add Project" button.
- **Delivery Progress Table**:
  - Columns: Squad (with leader avatar), Contas, Time, Health Score (N/A fallback), Demandas, Concluídas (Green), Atrasadas, Progresso bar.

### Refinement
- Remove all static mock values from the screen.
- Standardize on Sora (titles) and Plus Jakarta Sans (body).
- Use pill-shaped badges and Ongo premium gradients.

## Technical Details
- **Charts**: Recharts for vertical bars.
- **Date Handling**: `date-fns` for calendar logic and holiday calculations.
- **State Management**: TanStack Query for data fetching and optimistic updates.
- **Icons**: Lucide React.
