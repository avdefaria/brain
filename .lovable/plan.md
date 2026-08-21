# Plano de Correção do Fluxo de Conversão de Leads

Este plano foca em corrigir erros de persistência (UUIDs como "undefined") e melhorar o mapeamento financeiro durante a conversão de leads em clientes.

## Alterações Técnicas

### 1. Banco de Dados (opcional, se necessário)
- Verificar se `contracts.monthly_value` é suficiente ou se precisamos de `clients.monthly_value`.
- **Decisão**: A tabela `contracts` já possui `monthly_value`. Vamos utilizar esse campo.

### 2. Frontend: Mapeamento de Dados (`src/components/LeadConversionModal.tsx`)
- Remover a injeção de valores financeiros no campo `scope_details` (descrição).
- Adicionar os campos `monthly_revenue` e `one_time_revenue` ao objeto `initialClientData` enviado para o modal de cadastro.
- Garantir que UUIDs ausentes sejam mapeados para `null`, nunca para a string `"undefined"`.

### 3. Frontend: Modal de Cadastro (`src/components/ClientRegistrationModal.tsx`)
- **Schema e Formulário**:
    - Adicionar `monthly_value` ao Zod schema e aos `defaultValues`.
    - Adicionar um campo de input (talvez oculto ou editável) para o Valor Mensal/Total.
- **Lógica de Submissão (`onSubmit`)**:
    - Limpar o `payload` para garantir que campos UUID (`niche_id`, `lead_id`) sejam `null` se vazios.
    - Ao criar o cliente, também criar ou atualizar um registro na tabela `contracts` com o `monthly_value` e o `type` (recorrente ou avulso) mapeados.

## Resumo das Modificações
- `src/components/LeadConversionModal.tsx`: Ajustar o objeto de dados iniciais.
- `src/components/ClientRegistrationModal.tsx`: Atualizar schema, UI e lógica de salvamento para incluir dados de contrato.
