# Plan: Corrigir Hierarquia e Módulo de Clientes

Este plano visa ajustar a navegação do módulo de Clientes, reconstruir a tela de "Visão Geral da Carteira" e aprimorar a "Gestão de Clientes" com novas funcionalidades e dados.

## 1. Ajuste de Hierarquia e Navegação
- [ ] Atualizar `src/components/AppShell.tsx`:
  - Mudar o `href` principal de "Clientes" para `/clients` (Visão Geral).
  - Manter os submenus: Gestão de Clientes (`/clients/manage`), Análise de Churn (`/clients/churn`) e Contratos (`/clients/contracts`).

## 2. Reconstrução da "Visão Geral da Carteira"
- [ ] Refatorar `src/routes/_authenticated.clients.index.tsx`:
  - **Cabeçalho**: Adicionar relógio em tempo real e fuso horário.
  - **KPIs**: 5 cards (Ativos, Novos, Churn, LTV, CAC) com tooltips e comparação percentual mensal.
  - **Gráficos**:
    - Clientes por mês (Área)
    - LTV por mês (Área)
    - Novos clientes por mês (Área)
    - CAC médio por mês (Linha)
    - Churn por mês (Linha)
    - Distribuição de risco (Rosca com estado vazio).
  - **Distribuição Geográfica**:
    - Mapa do Brasil interativo (intensidade por cor).
    - Painel lateral: Top 3 Canais de Vendas e Top 3 Cidades.
  - **Líderes e Squads**:
    - Lista "Contas por líder" com barras de progresso.
    - Gráfico "Health Score por Squad".
  - **Tabela de Clientes Prioritários**: Top 5 menor health score com filtros e paginação.

## 3. Melhorias no Cadastro de Clientes
- [ ] Atualizar `src/components/ClientRegistrationModal.tsx`:
  - Adicionar campo `sales_channels` (Seleção Múltipla) no bloco "Informações comerciais".
  - Opções: Mercado Livre, Shopee, Amazon, TikTok Shop, Magalu, Americanas, Shein, Loja própria, Instagram, + novos.
  - Garantir que os dados sejam salvos no novo campo `sales_channels` (text[]) no Supabase.

## 4. Menu de Ações na Gestão de Clientes
- [ ] Atualizar `src/routes/_authenticated.clients.manage.tsx`:
  - Implementar o menu de 3 pontos na coluna "Ações" com:
    - WhatsApp (link dinâmico).
    - Enviar e-mail.
    - Ver detalhes, Pesquisa health score, Editar, Configurar entregáveis.

## Detalhes Técnicos
- Utilizar `Recharts` para todos os gráficos.
- Implementar o mapa com `react-simple-maps`.
- Manter a paleta Ongo Indigo (#3D4FE8) e design de cápsulas.
- Assegurar compatibilidade com o schema do Supabase (coluna `sales_channels` já adicionada via migração).
