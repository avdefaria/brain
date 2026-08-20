---
name: Task Detail Panel Refactor
description: Fixes for attachments, description editor, sharing, deletion, and history tracking in the Task module.
type: feature
---
# Task Detail Panel Refactor Plan

## 1. Database Schema
- **task_attachments**: Verify `file_url` column name.
- **task_history**: Table exists but needs RLS and triggers or manual entries. Columns: `id`, `task_id`, `user_id`, `action`, `changes` (JSONB), `created_at`.

## 2. Server Functions (src/lib/tasks.functions.ts)
- `deleteTask`: Authenticated deletion of tasks.
- `addTaskHistory`: Internal or exported function to log changes.
- `addTaskAttachment`: Fix `file_url` mapping if incorrect.
- Update `updateTask` to record history.

## 3. UI Components (src/components/TaskDetailPanel.tsx)
- **Description**: Use a proper text area or rich text component.
- **Sharing**: Implement Share via Email and WhatsApp.
- **Deletion**: Add Trash button functionality with confirmation.
- **Attachments**: Fix upload logic based on column schema.
- **History**: Ensure real-time updates and display logs.
