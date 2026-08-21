# Plano para Implementação do Módulo CRM (Kanban de Leads)

Implementação do módulo CRM para gestão de leads em pipeline kanban, com KPIs, drag-and-drop e conversão manual para cliente.

## 1. Banco de Dados (Supabase)

- **Tabela `leads`**: Criar tabela com campos: `id`, `name`, `company`, `email`, `phone`, `recurring_revenue`, `one_time_revenue`, `expected_close_date`, `responsible_id` (FK profiles), `monthly_revenue_range`, `niche_id` (FK niches), `origin`, `notes`, `funnel_stage` (default 'novos_leads'), `position`, `created_at`.
- **Relacionamento**: Adicionar `lead_id` na tabela `clients` para rastreabilidade.
- **Segurança (RLS)**: Habilitar RLS na tabela `leads` com permissões de `SELECT`, `INSERT` e `UPDATE` para usuários autenticados.
- **Grants**: Garantir acessos para `authenticated` e `service_role`.

## 2. Server Functions (`src/lib/leads.functions.ts`)

- `getLeads`: Busca todos os leads com JOIN em `profiles` (responsável) e `niches`.
- `createLead`: Insere novo lead.
- `updateLead`: Atualiza dados do lead (incluindo `funnel_stage` e `position`).
- `getLeadStats`: Calcula KPIs reais (Total, Propostas, Pipeline, Vendas, Perdas).

## 3. Interface (Frontend)

- **Rota Comercial**: Criar `src/routes/_authenticated.comercial.crm.tsx`.
- **Sidebar**: Adicionar submenu "CRM" sob "Comercial" no `AppShell.tsx`.
- **Componentes CRM**:
  - `LeadKPIs.tsx`: Exibe os cards de métricas no topo.
  - `LeadKanban.tsx`: Gerencia as 8 colunas e o drag-and-drop usando `@hello-pangea/dnd`.
  - `LeadCard.tsx`: Exibe informações resumidas do lead no kanban.
  - `LeadFormModal.tsx`: Formulário para criação/edição de leads.
  - `LeadConversionModal.tsx`: Interface para converter lead em cliente, pré-preenchendo dados.

## 4. Fluxo de Conversão

- O botão "Converter em cliente" no card do lead abrirá o `LeadConversionModal`.
- Ao salvar, os dados serão enviados para a função de criação de cliente existente, passando o `lead_id`.
- O registro original do lead permanece intacto no CRM para histórico.

## Detalhes Técnicos

- **Kanban Order**: Novos leads, Primeiro contato, Em negociação, Apresentação da agência, Proposta enviada, Follow up, Vendas feitas, Vendas perdidas.
- **Pipeline Calculation**: Soma de `recurring_revenue` apenas para leads em etapas "ativas" (excluindo perdas/vendas feitas, conforme regra de negócio a ser validada durante o desenvolvimento).
- **Tech Stack**: TanStack Start, Supabase RLS, Tailwind CSS, Lucide React.
