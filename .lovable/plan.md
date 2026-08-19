# Technical Audit and Fix: Client Registration (Niches and Sales Channels)

Diagnose and fix errors during client registration when adding niches and sales channels.

## Proposed Changes

### 1. Database & Security (RLS)
- Ensure all relevant tables have proper RLS policies for authenticated users.
- Verify that `authenticated` role has `SELECT` and `INSERT` permissions via `GRANT` statements.
- Tables to check/fix: `niches`, `sales_channels`, `client_sales_channels`, `clients`.

### 2. Data Integrity
- Verify and repopulate default options for Channels and Niches if missing.
- **Channels**: Mercado Livre, Shopee, Amazon, TikTok Shop, Magalu, Americanas, Shein, Loja própria, Instagram.
- **Niches**: Moda, Decoração, Ferramentas, Beleza e Cosméticos, Casa e Jardim, Eletrônicos, Pet, Infantil, Esporte e Fitness, Alimentos e Bebidas, Saúde e Bem-estar, Automotivo, Papelaria, Joias e Acessórios.

### 3. Application Logic
- **Transactional Save**: Refactor the submission logic in `ClientRegistrationModal.tsx` to handle client creation and relationship linking (junction table) correctly.
- **Sequential Creation**: Ensure the client is created first, obtaining the `id`, before inserting into `client_sales_channels`.
- **Error Handling**: Improve feedback UI by displaying clear error messages using `toast` and detailed logging for debugging.

### 4. Component Refinement
- Ensure dynamic addition of new niches and channels works without breaking the main form submission.

## Technical Details
- **Tables**: `public.niches`, `public.sales_channels`, `public.client_sales_channels`, `public.clients`.
- **Files**:
    - `src/components/ClientRegistrationModal.tsx`
    - `src/lib/clients.functions.ts`
    - `src/lib/sales-channels.functions.ts`
    - `src/lib/niches.functions.ts`
- **Migration**: Create a new migration to ensure RLS and seed data are correctly set.
