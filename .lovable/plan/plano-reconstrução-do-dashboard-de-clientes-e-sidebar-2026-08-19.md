# Plano: Reconstrução do Dashboard de Clientes e Sidebar

## 1. Sidebar (AppShell.tsx)
- Adicionar os módulos solicitados na ordem correta: Início, Clientes (submenus: Gestão, Churn, Contratos), Projetos, Comercial, Finanças, Recursos Humanos, Toolkit, Gestão de Usuários, Perfil e Assinatura.
- Módulos não construídos apontarão para uma rota genérica `/em-breve`.

## 2. Backend (src/lib/clients.functions.ts)
- Atualizar `getClientsOverviewData` para retornar:
  - KPIs: Ativos, Novos, Churn, LTV Médio, CAC Médio.
  - Dados para os 6 gráficos (Clientes/mês, LTV/mês, Novos clientes/mês, CAC médio/mês, Churn/mês, Health Score/squad).
  - Rankings reais: Top 3 Nichos e Top 3 Canais de Vendas.
  - Listagem de líderes e distribuição de risco.
  - Tabela de 5 clientes prioritários (menor score).
- Garantir que retorne eixos de 12 meses mesmo sem dados.

## 3. Frontend (src/routes/_authenticated.clients.index.tsx)
- Implementar a estrutura de cards e grids solicitada.
- **Gráficos (Recharts)**: Estilizar com gradientes verticais 12%->0%, linhas 2px, sem grades verticais, tooltip premium.
- **Mapa do Brasil**: Usar `react-simple-maps` com estados interativos, preenchimento proporcional e legenda.
- **Rankings**: Lógica de ranking Top 3 Nichos e Canais no painel lateral do mapa.
- **Estados Vazios**: Garantir que a estrutura não suma; KPIs zerados e gráficos com eixos.

## Detalhes Técnicos
- Paleta Ongo: Indigo (#3D4FE8), Verde (#22C55E), Âmbar (#F5A524), Vermelho (#EF4444).
- Tipografia: Sora (Títulos) e Plus Jakarta Sans (Corpo).
- Badge de cápsula e ícones em fundo Indigo a 8%.
