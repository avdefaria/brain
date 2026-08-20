# Plano de Correção: Persistência de Autenticação (F5)

O objetivo é evitar que o usuário seja deslogado ao recarregar a página (F5) devido à falta de sincronia entre o SSR (onde o `localStorage` não existe) e o cliente Supabase. Adotaremos a estratégia de validação no cliente para garantir que o redirecionamento só ocorra após a confirmação real da ausência de sessão.

## Alterações Técnicas

### 1. Criar Hook de Autenticação
- Criar `src/hooks/use-auth.ts` para encapsular a lógica de verificação de sessão.
- O hook aguardará a inicialização do Supabase e verificará tanto `getSession()` quanto o estado via `onAuthStateChange`.

### 2. Refatorar Layout Autenticado (`src/routes/_authenticated.tsx`)
- Remover a lógica de redirecionamento do `beforeLoad` (que roda no servidor e quebra no F5).
- Mover a lógica de proteção para o componente `AuthenticatedLayout`.
- Enquanto a sessão está sendo validada no cliente, exibir um componente de carregamento (Spinner/Logo).
- Só redirecionar para `/auth/login` se, após a hidratação, for confirmado que não há sessão válida.

### 3. Ajustar Rota Raiz (`src/routes/index.tsx`)
- Alterar o `beforeLoad` para evitar o redirecionamento cego.
- Deixar que o cliente decida o destino após a carga inicial.

### 4. Componente de Carregamento
- Implementar um `AuthLoading` visualmente consistente com a marca Ongo.

## Detalhes Técnicos

- **TanStack Router**: Manter o uso de `redirect` mas apenas em contextos onde a sessão é garantida (como após login bem-sucedido).
- **Supabase**: Utilizar `onAuthStateChange` para garantir que mudanças de estado (expiração de token) sejam capturadas em tempo real.
- **SSR**: No servidor, o estado será sempre "carregando", evitando o flash de redirecionamento incorreto.

## Validação e Testes

- **Teste de Persistência**: Login -> F5 (5x) -> Permanecer logado.
- **Teste de Segurança**: Logout -> Acessar `/dashboard` -> Redirecionar para `/auth/login`.
- **Ambientes**: Testar no preview local para garantir que a hidratação não cause "flickering".
