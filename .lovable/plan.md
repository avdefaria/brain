# Plano de Sincronização Lead -> Cliente (Conversão)

Este plano descreve as alterações necessárias para que o popup de conversão de leads em clientes seja pré-preenchido com todos os dados relevantes do lead, incluindo canais de vendas e mapeamento inteligente de receitas para tipos de contrato.

## Alterações

### Componente `LeadConversionModal.tsx`

*   Atualizar o mapeamento de `initialClientData`:
    *   Incluir `sales_channels` vindo de `lead.lead_sales_channels`.
    *   Implementar a lógica de mapeamento de receita:
        *   Se `recurring_revenue` > 0: `contract_type` = "recurring", `scope_details` incluirá menção à receita recorrente.
        *   Se `one_time_revenue` > 0 e sem recorrente: `contract_type` = "one-off", populando valor.
        *   Se ambos existirem: priorizar "recurring" e adicionar um aviso no `extra_comments` ou `scope_details`.
    *   Mapear `niche_id` corretamente.

### Componente `ClientRegistrationModal.tsx`

*   Adicionar campos de valor ao formulário (se ainda não existirem de forma explícita para o contrato). *Nota: O esquema atual não parece ter campos de 'valor' explícitos além dos metadados de contrato, vou verificar se preciso adicionar campos de UI para isso.*
*   Garantir que os campos pré-preenchidos permaneçam editáveis (comportamento padrão do `form.reset` no `useEffect`).
*   Adicionar um alerta visual simples se o lead tiver tanto receita recorrente quanto única, conforme solicitado.

## Detalhes Técnicos

*   O mapeamento de canais de vendas precisa converter o formato do banco (`lead_sales_channels` -> `sales_channels.name`) para o formato esperado pelo `ClientRegistrationModal` (um array de strings com os nomes).
*   Não usar `early return` no componente conforme as regras obrigatórias.

## Verificação

1.  Criar/Editar um lead com Canais de Vendas, MRR e Receita Única.
2.  Clicar em "Converter" no Kanban ou Tabela.
3.  Validar se o modal de Cliente abre com:
    *   Canais de vendas marcados.
    *   Tipo de contrato correto (Recorrente se houver MRR).
    *   Aviso sobre receita única se ambas existirem.
    *   Dados editáveis.
