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
- Crie APENAS: a tabela de recebíveis, a lógica de geração automática ao 
  criar/editar contrato, e os campos que faltam em `contracts` 
  (start_date, payment_method). Não construa a tela de Finanças ainda — 
  isso é o próximo prompt.
- RLS explícito de SELECT, INSERT, UPDATE e DELETE na nova tabela.
- Confirme via information_schema a estrutura atual da tabela `contracts` 
  antes de alterar (campos existentes: monthly_value, mrr_months, 
  contract_type/tipo recorrente-avulso, etc.) e me diga o que encontrou.

O QUE FAZER:

1. Adicionar campos que faltam em `contracts`, se ainda não existirem:
   - `start_date` (date, obrigatório para gerar recebíveis)
   - `payment_method` (texto, catálogo simples: Pix, Boleto, Cartão, 
     Transferência)

2. Criar tabela `receivables` (recebimentos):
   - id, client_id (FK clients), contract_id (FK contracts, nullable)
   - amount (numeric)
   - due_date (date)
   - installment_number (integer, nullable — ex: 3 de 12, null se avulso)
   - status (enum: pendente, pago, atrasado — calculado dinamicamente: 
     "atrasado" = due_date < hoje E status ainda não é "pago")
   - paid_at (timestamp, nullable)
   - payment_method (texto, nullable — pode diferir do padrão do 
     contrato caso pago diferente)
   - notes (texto, nullable)

3. Lógica de geração automática:
   - Ao criar/editar um contrato do tipo "Recorrente" com start_date, 
     monthly_value e mrr_months preenchidos: gerar automaticamente N 
     registros em `receivables` (um por mês, começando em start_date), 
     cada um com amount = monthly_value, due_date incrementando 1 mês por 
     parcela, installment_number de 1 até mrr_months.
   - Ao criar/editar um contrato do tipo "Projeto Avulso": gerar um único 
     registro em `receivables` com amount = valor do projeto, due_date = 
     start_date, installment_number = null.
   - Se o contrato for editado DEPOIS de já ter recebíveis gerados (ex: 
     mudou o valor do MRR): NÃO recriar/duplicar os recebíveis já 
     existentes automaticamente — isso poderia apagar edições manuais 
     que o usuário já fez. Apenas gerar recebíveis para contratos novos 
     ou que ainda não têm nenhum recebível vinculado. Me avise se 
     encontrar um caso ambíguo antes de decidir sozinho.

Depois de aplicar, teste criando um contrato recorrente de teste (ex: 
R$1.000/mês por 3 meses) e confirme com SELECT real que 3 registros 
foram criados em `receivables` com os due_dates corretos. Me devolva o 
resultado do diagnóstico do item de contracts e a lista de arquivos 
alterados/criados.
      </div>
    </div>
  );
}
