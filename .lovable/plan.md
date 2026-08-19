# Plano de Reconstrução do Módulo Clientes

Reconstrução da interface de Clientes para alinhar com os requisitos visuais da Ongo (Brain), focando em dashboards analíticos, mapas interativos e gestão de contratos, utilizando dados reais do banco.

## Ações Realizadas
- Atualizada a Sidebar no `AppShell.tsx`: Removidos submenus duplicados/desnecessários e corrigida a lógica de item ativo.
- Criado `src/lib/clients.functions.ts` para buscar dados reais (KPIs, Distribuição Geográfica, Top Canais/Cidades, Health Score).

## Próximos Passos

### 1. Interface de Cadastro e Edição
- [ ] No `ClientRegistrationModal.tsx`, adicionar o campo multi-seleção de "Canais de vendas" no bloco "Informações comerciais".
- [ ] Adicionar opções: Mercado Livre, Shopee, Amazon, TikTok Shop, Magalu, Americanas, Shein, Loja própria, Instagram.

### 2. Reconstrução da Tela "Visão Geral da Carteira" (`/clients`)
- [ ] Implementar a faixa de 5 cards de KPI com ícones, tooltips e badges de tendência usando dados do `getClientsOverviewData`.
- [ ] Criar os dois primeiros gráficos de área: "Clientes por mês" e "LTV por mês".
- [ ] Desenvolver o card de "Distribuição Geográfica":
    - Renderizar o mapa do Brasil real (usando `react-simple-maps` e `topojson`).
    - Colorir estados proporcionalmente à quantidade de clientes.
    - Adicionar controles de zoom e legenda.
    - Implementar o painel lateral com rankings de "Top 3 Canais" e "Top 3 Cidades".
- [ ] Adicionar a segunda linha de gráficos: "Novos clientes" (Área) e "CAC médio" (Linha).
- [ ] Adicionar a terceira linha de gráficos: "Churn por mês" (Linha) e "Distribuição de risco" (Rosca).
- [ ] Implementar os cards "Contas por líder" (Lista com barras de progresso) e "Health score por squad" (Barras).
- [ ] Criar o card "Clientes prioritários" com a tabela detalhada (Risco, Score, CAC, Tempo de contrato).

### 3. Remoção de Dados Fictícios
- [ ] Substituir todos os mocks nas telas de Churn e Contratos por chamadas ao servidor.

## Detalhes Técnicos
- **Mapas**: Uso de `react-simple-maps` com `topojson-client`.
- **Gráficos**: `recharts` configurado com a paleta Ongo Indigo (#3D4FE8).
- **Dados**: Integração total com Supabase via TanStack Query e Server Functions.
- **Visual**: Manutenção do design "pill" e tipografia Sora/Plus Jakarta Sans.
