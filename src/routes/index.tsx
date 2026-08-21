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
Antes de eu confirmar qualquer coisa, preciso de um diagnóstico técnico, 
sem interpretação:

1. Mostre a estrutura exata (colunas e tipos) da tabela criada para 
   recebíveis/receivables via information_schema.

2. Existe lógica de geração automática de parcelas ao criar um contrato 
   recorrente (MRR x Qtd. de Meses)? Se sim, mostre o trecho de código 
   exato responsável por isso.

3. Os KPIs exibidos na tela de Finanças vêm de SELECT real no banco, ou 
   há algum valor fixo/mockado no código? Mostre a query ou o cálculo 
   usado para cada KPI.

4. O campo `start_date` e `payment_method` foram adicionados na tabela 
   `contracts`? Confirme via SELECT.

5. Por que o arquivo `src/routes/index.tsx` foi alterado neste prompt? 
   Mostre exatamente o que mudou nele.
      </div>
    </div>
  );
}
