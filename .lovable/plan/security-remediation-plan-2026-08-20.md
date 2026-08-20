# Security Remediation Plan

Fix identified critical security issues in the Supabase backend (Storage and RLS).

## User Review Required

> [!IMPORTANT]
> - I will modify storage policies to restrict public access to task attachments.
> - I will tighten RLS on the `client_public_access` table to prevent unauthorized token exposure.

- **Storage Security**: The `task-attachments` bucket currently allows public reads. I will restrict this to authenticated users only.
- **Data Exposure**: The `client_public_access` table allows all authenticated users to read all rows, exposing tokens. I will restrict this so users can only see relevant tokens (or disable public read if unnecessary).

## Technical Details

### 1. Storage Policy Update
- **Target**: `storage.objects` table.
- **Action**: Delete the `Allow public reads` policy for `bucket_id = 'task-attachments'`.
- **New Policy**: Add a `SELECT` policy for the `authenticated` role on the `task-attachments` bucket.

### 2. RLS Hardening for `client_public_access`
- **Target**: `public.client_public_access` table.
- **Current Issue**: Policy `Allow authenticated to manage access tokens` uses `USING (true)`, which allows any logged-in user to see every token.
- **Action**: 
    - Investigate if the table is even used (initial search shows minimal usage).
    - If used, restrict `SELECT` to users who have a relationship with the client (e.g., via `profiles` or `user_roles`).
    - If not actively used for security-sensitive operations, restrict `ALL` to `service_role` or specific administrative roles.

### 3. Verification
- Re-run `supabase--linter` to confirm Critical issues are resolved.
- Manual check of `pg_policies` to ensure new restrictions are active.

```sql
-- Example logic for storage
DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;
CREATE POLICY "Allow authenticated reads" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'task-attachments');
```
