# Plano de Implementação - Módulo de Clientes

Este plano descreve a implementação do módulo "Clientes" no sistema Brain, seguindo o design system da Ongo.

## Backend (Supabase)

### 1. Migração de Dados
Criar a tabela `clients` e `contracts` com as seguintes colunas e relações:
- `clients`: id, name, cnpj_cpf, address, country, state, city, corporate_email, contact_name, contact_whatsapp, squad_id (FK), segment, start_date, end_date_expected, scope_details, extra_comments, health_score, status (active/inactive/churn), risk_level (low, medium, high).
- `contracts`: id, client_id (FK), contract_number, type (recurring/one-off), monthly_value, total_value, start_date, renewal_date, auto_renewal (bool), status, payment_method, payment_day.

### 2. Segurança e RLS
- Habilitar RLS nas novas tabelas.
- Criar políticas para `authenticated` roles baseadas no `has_role` e squad membership.
- Conceder `GRANT` para `authenticated` e `service_role`.

### 3. Lógica de Negócio (Triggers/Functions)
- Função para calcular `health_score` (0-100) baseada em:
  - Pontualidade de pagamento (mock por enquanto).
  - Entregas no prazo (mock por enquanto).
  - Tempo de contrato (calculado).

## Frontend

### 1. Rotas
Adicionar as seguintes rotas sob `_authenticated`:
- `/clients`: Visão Geral da Carteira (tela inicial do módulo).
- `/clients/manage`: Gestão de Clientes (lista e filtros).
- `/clients/$clientId`: Detalhes do Cliente.
- `/clients/churn`: Análise de Churn.
- `/clients/contracts`: Gestão de Contratos.

### 2. Componentes de UI
- `ClientSidebar`: Atualizar a sidebar para incluir o menu "Clientes" com submenus.
- `ClientCard`: KPI com comparativos de percentual.
- `ClientRegistrationModal`: Modal multi-etapas para cadastro de cliente.
- `ContractDetailModal`: Modal com detalhes financeiros e de período.
- `BrazilianMap`: Visualização de distribuição geográfica.
- `CohortTable`: Tabela de retenção para análise de churn.

### 3. Gráficos (Recharts)
- Clientes ativos por mês.
- LTV e CAC médio por mês.
- Distribuição de risco (Donut chart).
- Churn por categoria.

## Regras Técnicas
- Manter o padrão de `pill` (cápsula) para badges e status.
- Usar Sora para títulos e Plus Jakarta Sans para dados.
- Implementar estados vazios com ícones e ações sugeridas.
- Garantir responsividade mobile em todas as novas telas.
