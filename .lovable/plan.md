---
name: Task Detail Panel Implementation
description: Plan for implementing task details editing (stage, assignees, tags, attachments) with Supabase integration.
type: feature
---
I will implement the task detail editing functionality by creating the necessary database schema, server functions, and updating the UI components.

### 1. Database Schema
- Create `tags` table: `id` (uuid), `name` (text, unique).
- Create `task_tags` table: `task_id` (uuid), `tag_id` (uuid).
- Create `task_attachments` table: `id` (uuid), `task_id` (uuid), `file_name` (text), `file_url` (text), `uploaded_by` (uuid), `created_at` (timestamp).
- Configure RLS and GRANTs for all new tables.
- Create Supabase Storage bucket `task-attachments` with public read and authenticated upload policies.

### 2. Server Functions (`src/lib/tasks.functions.ts`)
- `updateTask`: Update basic task fields (stage, priority, deadline, description).
- `updateTaskAssignees`: Sync many-to-many relationship in `task_assignees`.
- `getTaskTags` / `addTagToTask` / `removeTagFromTask`: Manage task tags.
- `createTag`: Allow adding new unique tags to the global list.
- `addTaskAttachment`: Save attachment metadata after storage upload.
- `deleteTaskAttachment`: Remove metadata (storage cleanup handled via trigger or manual call).
- `getProfiles`: Fetch available collaborators for the assignment selector.

### 3. UI Components
- **TaskDetailPanel.tsx**:
    - Replace static "Stage" with a `Select` component.
    - Replace "Assignees" with a multi-select component (using `profiles` data).
    - Implement a new "Tags" section with a "+" button and pill-shaped badges.
    - Implement an "Attachments" section with a file upload area and list of uploaded files.
- **MultiSelectProfiles.tsx**: Create a reusable multi-select for profiles/users.

### 4. Integration
- Connect the Kanban state to `updateTask` so moving a card updates the database.
- Use TanStack Query to invalidate and refetch task data after edits.
