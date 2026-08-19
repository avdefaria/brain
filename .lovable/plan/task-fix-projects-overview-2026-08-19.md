
## Task: Fix Projects Overview

### 1. Database & Backend Fixes
- Add `color` and `leader_id` columns to `squads` if missing (via migration).
- Clean invalid squad data in `clients` table (set to NULL if not a valid UUID).
- Seed/Ensure existence of "Squad Alpha", "Squad Beta", "Squad Delta", "Squad Gamma".
- Update `getProjectsOverviewData` to include birthdays from `profiles` and events from a new `company_events` table.
- Create `company_events` table: `id`, `name`, `date`, `type` (event, commercial, internal), `repeat_annually`.
- Add `birth_date` to `profiles` if missing.

### 2. UI Components Fixes
- **SquadManagementDialog**:
  - Add "Create" mode (currently only supports "Edit").
  - Ensure `leader_id` is updated in `profiles` when a leader is assigned to a squad (or vice-versa).
- **ProjectCalendar**:
  - Remove nested calendars.
  - Fix PT-BR localization and cell sizes.
  - Implement event markers and click handlers.
- **UpcomingDates**:
  - Filter for dates `>= today`.
  - Logic for mobile holidays, commercial dates, and birthdays.
  - Custom events from `company_events`.
- **SpecialProjectsTimeline**:
  - Implement state for `currentWeek`, `viewMode` (week/month), and filters.
  - Create `SpecialProjectModal` for adding projects.
  - Render projects across the timeline grid.
- **DeliveryProgressTable**:
  - Re-add the component to the main page.
  - Ensure correct data mapping from `processedSquads`.

### 3. Route & Integration
- Update `src/routes/_authenticated.projects.tsx` to handle new states and modals.
- Update `ClientRegistrationModal` to ensure it sends `squad_id` as UUID.
