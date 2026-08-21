# Plan: Funnel Type Management Enhancements

Refine the `funnel_types` management by adding deletion capabilities with usage checks and ensuring consistent data synchronization across the CRM dashboard filters.

## User Review Required
> [!IMPORTANT]
> I have confirmed that the "Funil" filter on the CRM dashboard is already reading directly from the `funnel_types` table via the `getFunnelTypes` server function. However, I will improve the synchronization to ensure it updates immediately when types are created or deleted without requiring a page refresh.

## Proposed Changes

### Database & Security
- Add a `DELETE` policy for the `authenticated` role on the `funnel_types` table to allow managers to remove unused types.
- **Verification:** Ensure the `leads` table's `funnel_type_id` foreign key correctly references `funnel_types`.

### Backend (Server Functions)
- **`src/lib/leads.functions.ts`**:
    - Add `deleteFunnelType` server function.
    - Implement a usage check: query the `leads` table to count how many records are using the target `funnel_type_id`.
    - If count > 0, return a specific error message ("Não é possível excluir: X lead(s) estão usando este tipo de funil.").
    - If count == 0, proceed with deletion.

### UI Components
- **`src/components/LeadFormModal.tsx`**:
    - Inside the funnel type `Combobox` list, add a small trash icon (`Trash2`) next to each option.
    - Implement the deletion flow:
        1. Click trash icon -> Confirmation modal ("Excluir tipo de funil '[nome]'?").
        2. Call `deleteFunnelType`.
        3. On success, update local state and invalidate the `funnel-types` query.
        4. Handle the "in use" error by showing a toast with the specific message.
- **`src/routes/_authenticated.comercial.crm.tsx`**:
    - Ensure the "Funil" `Select` component uses the data from the `funnel-types` query, which is already correctly hooked into the `getFunnelTypes` function.

## Technical Details
- **RLS Migration**:
  ```sql
  CREATE POLICY "Enable delete for authenticated users" ON public.funnel_types FOR DELETE TO authenticated USING (true);
  ```
- **Usage Check Logic**:
  ```typescript
  const { count } = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('funnel_type_id', id);
  ```
- **State Sync**: Use TanStack Query's `invalidateQueries` to keep the dashboard filter and the lead modal in sync after mutations.

## Verification Plan
1. **Creation Sync**: Create "New Test Funnel" in the lead modal, close modal, and check if it immediately appears in the CRM dashboard "Funil" filter.
2. **Deletion (In Use)**: Assign a lead to "Prospecção Ativa". Try to delete "Prospecção Ativa" from the lead modal. Verify the error message appears.
3. **Deletion (Unused)**: Create a temporary funnel, don't assign any leads, and delete it. Verify it disappears from both the modal and the dashboard filter.
