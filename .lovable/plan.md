# Plan: Task Kanban Persistence

Implement server-side persistence for the Kanban board, ensuring task stages and order are saved to the database.

## Technical Details

- **Database Schema**: Add a `position` column to the `tasks` table to store the display order within stages.
- **Server Functions**:
  - `getTasks`: Fetch tasks ordered by their position.
  - `updateTaskPosition`: Update a task's stage and position after a drag-and-drop operation.
- **Frontend Integration**:
  - Replace mock data with real data using TanStack Query.
  - Trigger database updates on `onDragEnd`.
  - Optimistically update the UI to maintain a smooth experience.

## Steps

### 1. Database Migration
- Add `position` (integer) to the `tasks` table.
- Default existing tasks to a sequential position.
- Add `GRANT` permissions for the new column.

### 2. Server Logic
- Create `src/lib/tasks.functions.ts` to handle CRUD operations for tasks.
- Implement efficient batch updates for reordering if necessary.

### 3. UI Refactoring
- Update `src/routes/_authenticated.projects.tasks.tsx` to use the new server functions.
- Implement the `onDragEnd` logic to synchronize with the backend.
- Ensure the Kanban reflects the persisted state on page reload.
