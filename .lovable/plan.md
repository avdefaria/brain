# Plan for Client Module Fixes and Improvements

## 1. Ranking "Top 3 Sales Channels" Fix & Data Cleanup
- **Database Migration**: Remove mock data from `clients` table.
- **Data Fetching**: Update `getClientsOverviewData` in `src/lib/clients.functions.ts` to use the `client_sales_channels` junction table instead of the (possibly) legacy `sales_channels` column on the `clients` table.
- **Ranking Logic**: Refine the ranking calculation to count unique clients per channel, sort by frequency, and calculate percentages accurately.
- **Empty States**: Ensure the dashboard displays a proper empty state when no clients are registered.

## 2. Actions Menu and "Edit Client" Functionality
- **Modal Update**: Modify `ClientRegistrationModal.tsx` to support an "edit mode".
- **Props**: Add `clientId` and `initialData` props to the modal.
- **State Management**: Ensure the form is pre-filled with existing client data when editing.
- **Menu Actions**: Fix the "Edit client" button in `_authenticated.clients.manage.tsx` to trigger the modal with the selected client's data.
- **Secondary Actions**: Ensure "WhatsApp", "Send Email", and "View Details" are correctly wired and functional.

## 3. Renaming "Segment" to "Nicho" and Dynamic Management
- **Database Schema**: 
    - Create `niches` table with `id` (UUID) and `name` (TEXT, unique).
    - Seed `niches` table with initial values: Moda, Decoração, Ferramentas, etc.
    - Add `niche_id` (UUID) foreign key to `clients` table.
- **Server Functions**: 
    - Create `src/lib/niches.functions.ts` for listing and adding niches (with normalization/duplication checks).
- **UI Renaming**: 
    - Globally rename "Segmento" to "Nicho" in labels, placeholders, tables, and filters.
- **Component**: Create `NicheSelector.tsx` (similar to sales channels) allowing selection and dynamic creation of new niches.
- **Integration**: Update `ClientRegistrationModal.tsx` to use the new niche selection logic and persist to the database.

## Technical Details
- **Tables**: `public.niches`, `public.clients` (alter), `public.client_sales_channels`.
- **Normalization**: Trim and case-insensitive uniqueness for Niche names.
- **Security**: Add RLS policies and GRANTS for the new `niches` table.
- **Components**: Update `DropdownMenu` in `manage.tsx` and the form in `ClientRegistrationModal.tsx`.
