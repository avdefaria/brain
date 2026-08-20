# Plan: Implement Deliverables Management Module

Implementation of a new "Gestão de Entregáveis" module within Projects, allowing categorization of tasks by deliverable type and tracking dynamic progress per account.

## Database Changes
1. **New Table: `deliverable_types`**
   - Columns: `id` (uuid, PK), `name` (text, NOT NULL), `is_custom` (bool, default true), `created_at` (timestamptz, default now()).
   - Seed data: "Otimização de Anúncios", "Oferta Relâmpago", "Descontos", "Cupons", "Afiliados", "Tráfego Pago - Ads".
   - RLS: SELECT and INSERT enabled for `authenticated` role.

2. **Update Table: `tasks`**
   - Add `deliverable_type_id` (uuid, FK to `deliverable_types.id`, nullable).
   - Add `sku_reference` (text, nullable).

## Server Functions
1. **`src/lib/deliverables.functions.ts`**
   - `getDeliverableTypes`: Fetch all available deliverable types.
   - `getDeliverablesProgress`: Calculate progress per type for a specific account (completed tasks / total tasks).
2. **`src/lib/tasks.functions.ts`**
   - Update `getTasks` and task creation/update functions to handle `deliverable_type_id` and `sku_reference`.

## UI Components
1. **Task Forms**
   - Update `src/components/CreateTaskModal.tsx` to include "Tipo de entregável" (select) and "SKU / Código do produto" (input).
   - Update `src/components/TaskDetailPanel.tsx` (or equivalent) to display/edit these fields.
2. **New Page: `src/routes/_authenticated.projects.deliverables.tsx`**
   - Implement the "Gestão de Entregáveis" view.
   - Display cards for each deliverable type with progress bars and task counts.
   - Handle "No tasks linked" state gracefully.
3. **App Navigation**
   - Add "Gestão de Entregáveis" to the Projects submenu in `src/components/AppShell.tsx`.

## Verification Plan
1. **Database Audit**: Verify table structure and seed data via SQL.
2. **Task Creation**: Create 2 tasks for "Otimização de Anúncios" (one completed, one pending) for account "TechFlow Systems".
3. **Progress Tracking**: Access the new module and confirm the "Otimização de Anúncios" card shows 50% progress (1 of 2).
4. **UI Inspection**: Ensure no early returns and that all deliverable types are listed even with 0 tasks.

## Files to be Modified/Created
- `supabase/migrations/xxxx_add_deliverables.sql`
- `src/lib/deliverables.functions.ts` (New)
- `src/lib/tasks.functions.ts`
- `src/components/CreateTaskModal.tsx`
- `src/components/TaskDetailPanel.tsx`
- `src/components/AppShell.tsx`
- `src/routes/_authenticated.projects.deliverables.tsx` (New)
