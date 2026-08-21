import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  component: IndexComponent,
});

function IndexComponent() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (session) {
        navigate({ to: "/dashboard", replace: true });
      } else {
        navigate({ to: "/auth/login", replace: true });
      }
    }
  }, [session, loading, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F8FC] flex-col gap-4">
      <div className="w-12 h-8 bg-[#3D4FE8] rounded-full flex items-center justify-center animate-pulse">
        <div className="w-4 h-4 bg-white rounded-full"></div>
      </div>
      <div className="max-w-md text-sm text-gray-500 whitespace-pre-wrap font-mono p-4 bg-white rounded-lg shadow-sm border border-gray-100">
        REGRAS OBRIGATÓRIAS:
- Altere APENAS a tela de Análise de Churn: filtros do topo, estilo dos 
  gráficos/cards, e os dois KPIs/gráficos que dependem de histórico 
  financeiro. Não altere a estrutura de dados de churn_reasons nem 
  cancelled_at.
- Identidade visual obrigatória: paleta Ongo Indigo #3D4FE8 / Ongo Ink 
  #0E0E16 / Paper #F7F8FC / Slate #8A8FA3 / bordas #E4E6F0, semânticas 
  verde #22C55E / âmbar #F5A524 / vermelho #EF4444. Tipografia Sora + 
  Plus Jakarta Sans. Siga o MESMO padrão visual de cards e gráficos já 
  usado na tela "Início" (Dashboard) — confirme esse padrão antes de 
  estilizar.

O QUE FAZER:

1. Substituir o filtro "Mensal/Anual" por um seletor de "Período" 
   (intervalo de datas), mesmo padrão de UI já usado no filtro "Período" 
   do CRM.

2. Adicionar filtro "Motivo" (dropdown multi-select), populado a partir 
   da tabela `churn_reasons`.

3. Os dois filtros devem funcionar em conjunto e atualizar os KPIs e 
   componentes que JÁ funcionam com dado real (Taxa de Churn, Total de 
   Churn, Tempo Médio até Churn, Motivos de Churn, Clientes com Churn 
   Recente).

4. Para "Receita Perdida" e o gráfico "Churn por Mês": como dependem de 
   histórico financeiro que ainda não existe (módulo Finanças → 
   Recebimentos não construído), substitua o valor fictício por um 
   estado vazio claro: card cinza/neutro com texto "Disponível após 
   Finanças → Recebimentos" no lugar do número, sem quebrar o layout.

5. Restilizar os gráficos de linha e barras para usar as cores da 
   paleta permitida.

Depois de aplicar, teste os filtros de Período + Motivo nos KPIs que já 
funcionam, confirme que os dois cards financeiros mostram o estado vazio 
corretamente, e me devolva a lista de arquivos alterados.
      </div>
    </div>
  );
}
