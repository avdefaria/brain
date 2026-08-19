# Plan: Implement Projects and Tasks Modules

Add the "Projetos" module to the Brain system with two submenus: "Gestão de entregas" and "Tarefas", following the Ongo design system.

## User Review Required

> [!IMPORTANT]
> - **Rich Text Editor**: I will use `tiptap` or a similar lightweight library for the task description editor.
> - **Drag-and-Drop**: I will use `@hello-pangea/dnd` or `dnd-kit` for the Kanban board functionality.
> - **Real-time**: Tasks and deliverables will be updated in real-time using Supabase subscriptions.

## Proposed Changes

### Database Schema (Supabase)
- Create `project_deliveries` table to track client deliverables per month.
- Create `tasks` table with fields for title, description (JSON/HTML), stage, priority, deadline, estimated time, and actual time.
- Create `task_assignees` table for multiple responsible collaborators.
- Create `task_comments` table with support for mentions.
- Create `task_attachments` table.
- Create `task_history` table for activity logs.
- Add `task_stage` and `task_priority` enums.

### Sidebar & Navigation
- Update `AppShell.tsx` to include "Projetos" with submenus:
    - Gestão de entregas (`/projects/deliveries`)
    - Tarefas (`/projects/tasks`)

### Deliveries Management (`/projects/deliveries`)
- Implementation of the grid/list of client delivery cards.
- KPI indicators (Deliveries completed x/y).
- "Ver detalhes" side panel with all client info and tabbed navigation (Briefing, Brand kit, etc.).
- "Entregáveis" modal for monthly tracking and adjustment.

### Tasks Module (`/projects/tasks`)
- KPI dashboard for task status.
- Kanban board with drag-and-drop between stages.
- List view using Accordions.
- Advanced filtering and search.
- **Create Task Modal**: Multi-field form with Rich Text editor.
- **Task Detail Panel**: Side drawer with:
    - Status/Priority/Assignees management.
    - Timer (Play/Stop) for time tracking.
    - Comments section with @mentions.
    - Activity history.
    - File attachments.

## Technical Details
- **UI Components**: shadcn/ui (Card, Badge, Progress, Accordion, Tabs, Sheet).
- **Icons**: Lucide React.
- **Forms**: react-hook-form + zod.
- **Rich Text**: Tiptap editor.
- **DnD**: @hello-pangea/dnd.
- **Date Handling**: date-fns.
