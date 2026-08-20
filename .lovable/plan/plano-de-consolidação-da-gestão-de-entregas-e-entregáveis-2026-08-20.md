# Plano de Consolidação da Gestão de Entregas e Entregáveis

Este plano descreve a unificação dos módulos de "Gestão de Entregas" e "Gestão de Entregáveis" em uma única interface robusta baseada em **Contas (accounts)**, com visualização alternável e filtros avançados.

## Alterações Propostas

### 1. Backend & Server Functions
- **Sincronização de Dados Reais:** Atualizar `getDeliverablesProgress` em `src/lib/deliverables.functions.ts` para garantir que ele retorne dados agregados por Conta e por Tipo de Trabalho, removendo qualquer dependência de dados mockados.
- **Novas Consultas:** Implementar lógica para buscar contas vinculadas a squads, scores de saúde e prazos de contrato diretamente das tabelas `accounts`, `account_squads` e `contracts`.

### 2. Rotas e Navegação
- **Consolidação de Rotas:** 
  - Manter a rota `src/routes/_authenticated.projects.deliverables.tsx` mas renomeá-la internamente (ou manter o nome se preferir, mas o rótulo no menu será "Gestão de Entregas").
  - Remover a rota redundante (se existir) de "Gestão de Entregas" mockada.
- **Menu Lateral:** Atualizar o `AppShell.tsx` para remover o item duplicado, deixando apenas "Gestão de Entregas".

### 3. Interface do Usuário (UI)
- **Toggle de Visão:** Adicionar abas no topo da página: "Por Conta" e "Por Tipo de Trabalho".
- **Visão "Por Conta":**
  - Desenvolver grid de cards onde cada card é uma **Conta**.
  - Exibir: Nome da Conta, Squads (via account_squads), Health Score, Tempo de Contrato e Progresso (Tarefas concluídas / Total).
  - Implementar filtros: Busca, Squad, Fim de Contrato, Status e Tipo de Trabalho.
- **Visão "Por Tipo de Trabalho":**
  - Manter a lógica de cards por tipo (deliverable_types).
  - Adicionar filtro de Conta/Cliente para detalhamento.

### 4. Validação e Testes
- **Teste de Dados:** Verificar se a conta "TechFlow Systems" com o tipo "Otimização de Anúncios" reflete os mesmos números em ambas as visões.
- **Persistência de RLS:** Garantir que todas as novas chamadas utilizam `context.supabase` com autenticação.

## Arquivos a serem alterados
- `src/lib/deliverables.functions.ts` (Lógica de dados)
- `src/routes/_authenticated.projects.deliverables.tsx` (Nova interface unificada)
- `src/components/AppShell.tsx` (Navegação)
