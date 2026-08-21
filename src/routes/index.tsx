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
- Não corrija o visual ainda. Foco é: diagnosticar e criar a estrutura 
  de dados real, se não existir.
- Não altere a tabela `clients` além do necessário (campos de 
  cancelamento), nem outros módulos.

O QUE FAZER:

1. Confirme via information_schema se já existe alguma estrutura para 
   registrar cancelamento de cliente (ex: campo `status`, `cancelled_at`, 
   `churn_reason` em `clients`, ou tabela separada). Me diga o que 
   encontrar.

2. Se não existir, criar:
   - Campo `cancelled_at` (timestamp, nullable) em `clients`.
   - Campo `churn_reason` (texto, nullable) em `clients`, com catálogo 
     extensível de motivos (mesmo padrão de Nicho): Preço, Concorrência, 
     Suporte, Outros — mas permitindo adicionar novos motivos no futuro, 
     não hardcoded.
   - Garantir que ao mudar o Status do cliente para "Inativo" (aquele 
     toggle que acabamos de corrigir), o sistema pergunte o motivo do 
     cancelamento e grave `cancelled_at` = now() + o motivo escolhido.

3. Substituir TODOS os dados fictícios da tela de Análise de Churn 
   (KPIs, gráfico "Churn por Mês", "Motivos de Churn", tabela "Clientes 
   com Churn Recente", "Análise de Cohort de Retenção") por cálculos 
   reais em cima dos dados de `clients`. Se a Análise de Cohort de 
   Retenção exigir dado histórico que ainda não temos (ex: quantos 
   clientes entraram por mês ao longo do tempo), me avise antes de 
   inventar qualquer número — prefiro a seção vazia com "aguardando 
   dados" a mostrar número fictício.

Depois de aplicar, me devolva o resultado do diagnóstico do item 1 e a 
lista de arquivos alterados/criados.
      </div>
    </div>
  );
}
