# Plan: Fix Client Status Toggle

Establish a functional status toggle in the Client Management module that persists changes to the database.

## Technical Details

### Backend
1.  **Server Function**: Add `updateClientStatus` in `src/lib/clients.functions.ts` using `createServerFn`.
    *   Input: `{ id: string, status: 'active' | 'inactive' | 'churn' }`.
    *   Auth: Middleware `requireSupabaseAuth`.
    *   Logic: Update the `status` column in the `clients` table.
2.  **Database Migration**:
    *   Ensure the `clients` table has explicit `GRANT UPDATE` for the `authenticated` role.
    *   Maintain existing RLS policies (Admins/Leaders can update).

### Frontend
1.  **Component Update**: Modify `src/routes/_authenticated.clients.manage.tsx`.
    *   Import `Switch` from `@/components/ui/switch`.
    *   Replace the static `div` in the `Status` column with the `Switch` component.
    *   Implement `onCheckedChange` to call the `updateClientStatus` server function.
    *   Add a local optimistic update or `refetch` on success.
    *   Apply custom styles to the `Switch` to match the requested colors:
        *   **Active**: Background `#22C55E` (Green).
        *   **Inactive**: Background `#EF4444` (Red).

### Verification
1.  Click the toggle for a client.
2.  Verify the database update via query.
3.  Perform a page refresh (F5) to ensure the state persists.
