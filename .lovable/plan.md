# Plan for Client Module Reconstruction

## 1. Navigation Adjustments
- Remove "Visão Geral" from Clientes submenu in `AppShell.tsx`.
- Update the main "Clientes" link to point directly to `/clients/manage`.
- Keep "Análise de Churn" and "Contratos" submenus.

## 2. Rebuild "Gestão de clientes" Screen
- **Route**: `src/routes/_authenticated.clients.manage.tsx`
- **Header**: Left title "Gestão de clientes", right clock/date with timezone.
- **KPI Bar**: 5 cards with Ongo visual style:
    - Clientes cadastrados (icon left, tooltip right).
    - Clientes ativos (+ growth vs month).
    - Novos clientes (+ growth vs month).
    - Churn (+ reduction vs month).
    - LTV médio em meses (+ growth vs month).
- **Active Clients Block**:
    - Icons and primary action buttons (Cadastrar, Desativar, Ver todos).
    - Search field and "Alto Risco -> Baixo" filter.
    - Visibility selector.
    - Data table:
        - Columns: Cliente (sortable), Segmento (pill badge), Responsável (avatar + name), Risco (pill badge), Score, CAC, Tempo (clock icon + alert color if near end), Ações (3 dots menu).

## 3. Complete "Cadastrar cliente" Modal
- **Component**: `src/components/ClientRegistrationModal.tsx`
- Split into 6 visual blocks (cards with icons):
    - **Company Info**: Name, CNPJ/CPF (masked), Address, Country/State/City, Corporate Email.
    - **Contact**: Responsible Email, WhatsApp (masked).
    - **Commercial**: Squad (select), Segment (select), Contract Type (select).
    - **Timeline**: Start Date, Expected End Date.
    - **Contract File**: PDF upload (drag-and-drop, max 10MB).
    - **Notes**: "Contratado pelo cliente" (textarea + help text), "Comentários extras" (textarea + help text).
- Footer: Cancel and Save buttons.
- Styling: Ongo Indigo (#3D4FE8), Sora + Plus Jakarta Sans fonts.

## 4. Technical Details
- Use `react-imask` or similar for form masks.
- Use `react-dropzone` for file uploads.
- Ensure RLS compliance for new client fields.
- Use `date-fns` for date formatting and relative calculations.
