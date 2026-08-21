# Plano de Implementação: Módulo de Finanças e Recebíveis

Este plano estabelece a criação do módulo de Finanças para gerenciar os recebíveis gerados automaticamente pelos contratos, permitindo o acompanhamento de pagamentos, filtros por status e liquidação de parcelas.

## Alterações Propostas

### 1. Backend e Estrutura de Dados
- Validar e garantir a tabela `receivables` com RLS.
- Implementar server functions para CRUD de recebíveis em `src/lib/finances.functions.ts`.
- Criar lógica de liquidação (marcar como pago com data e método).

### 2. Interface de Usuário (Frontend)
- **Nova Rota `src/routes/_authenticated.financas.index.tsx`**:
  - Dashboard financeiro com KPIs (Total a Receber, Recebido no Mês, Atrasados).
  - Listagem principal de recebíveis com TanStack Table v8.
  - Filtros por: Período, Status (Pendente, Pago, Atrasado), Cliente e Método de Pagamento.
- **Visual e Identidade**:
  - Uso da paleta Ongo: Indigo (#3D4FE8) para ações, Verde (#22C55E) para pagos, Vermelho (#EF4444) para atrasados.
  - Badges em formato de cápsula.
  - Empty states informativos.
- **Ações Rápidas**:
  - Botão "Liquidar" (Marcar como pago) que abre um pequeno popover/modal de confirmação.
  - Edição rápida de data de vencimento e valor.

### 3. Integrações e Sincronização
- Garantir que a geração automática no `ClientRegistrationModal.tsx` esteja sincronizada com a nova listagem.
- Adicionar link para o módulo de Finanças no `AppShell` (Sidebar).

## Detalhes Técnicos

### Funções de Servidor (`src/lib/finances.functions.ts`)
- `getReceivables`: Busca com filtros complexos (join com `clients` e `contracts`).
- `updateReceivableStatus`: Atualiza status e `paid_at`.
- `getFinanceSummary`: Agrega valores para os KPIs do topo da tela.

### Componentes de UI
- Utilização de `DataTable` customizada com paginação e ordenação.
- `DatePickerWithRange` para filtro de período.
- `Select` múltiplo para filtros de status e nicho/cliente.

---
**Nota**: Não haverá integração com gateways de pagamento reais (Stripe/Iugu) nesta etapa, apenas controle manual de fluxo de caixa conforme solicitado.
