# Plano de Correção: Formulário de Clientes (Nichos e Canais)

O formulário de cadastro de clientes apresenta opções vazias nos campos de Nicho e Canais de Venda porque as `createServerFn` (funções de servidor) estão sendo chamadas incorretamente no frontend ou enfrentando problemas de autenticação no lado do servidor ao usar o cliente Supabase padrão sem o middleware de autenticação configurado corretamente para o contexto do TanStack Start.

## Alterações Técnicas

### 1. Refatoração das Funções de Servidor
- Ajustar `src/lib/niches.functions.ts` e `src/lib/sales-channels.functions.ts` para garantir que as funções `createServerFn` usem o middleware de autenticação do Supabase.
- Isso garante que o servidor receba o token do usuário e as políticas de RLS permitam a leitura dos dados.

### 2. Correção do Formulário de Cadastro
- Em `src/components/ClientRegistrationModal.tsx`, simplificar a lógica de carregamento dos dados iniciais.
- Adicionar tratamento de erro mais robusto e logs para identificar falhas de rede.
- Garantir que o componente `MultiSelectSalesChannels` e `NicheSelector` recebam as opções corretamente.

### 3. Validação de RLS e Permissões
- Re-executar migração de garantias (`GRANT`) e políticas de `SELECT` para as tabelas `niches`, `sales_channels` e `client_sales_channels` para assegurar acesso total a usuários autenticados.

## Detalhes de Implementação

### Backend (Funções)
- Adicionar `.middleware([attachSupabaseAuth])` (se aplicável no contexto do servidor) ou garantir o uso do `supabaseAdmin` para leitura de catálogos se o RLS for muito restritivo para leitura simples de "lookup tables". *Decisão: Manter RLS mas garantir que o cliente Supabase no servidor use os cabeçalhos de autorização.*

### Frontend (Modal)
- Verificar se `availableNiches` e `availableChannels` estão sendo populados.
- Corrigir a passagem de props para os seletores customizados.

## Próximos Passos
1. Modificar os arquivos de funções de servidor.
2. Atualizar o modal de cadastro.
3. Executar migração SQL corretiva para permissões.
4. Validar preenchendo o formulário manualmente na interface.
