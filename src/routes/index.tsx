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
        {`REGRAS OBRIGATÓRIAS:
- Altere APENAS a lógica que preenche os campos do ClientRegistrationModal 
  ao ABRIR o modal (não a lógica de submit/salvar, que já foi corrigida e 
  está funcionando). Não reintroduza o bug de UUID.
- Confirme antes: a correção anterior (INSERT vs UPDATE) removeu ou 
  quebrou o useEffect/estado inicial que populava os campos a partir do 
  lead? Me diga sim ou não.

O QUE FAZER:

1. Ao abrir o modal de conversão a partir de um lead, pré-preencher:
   - Squads vinculados: os mesmos squads já vinculados ao lead, se 
     houver esse dado no lead (se não houver campo de squad no lead, 
     apenas ignore este item e me avise).
   - Canais de Vendas: os mesmos já marcados no lead.
   - Tipo de Contrato: "Recorrente" se o lead tiver MRR preenchido, 
     "Projeto Avulso" se tiver apenas Receita Única.
   - Valor Mensal (MRR): valor do MRR do lead.

2. Todos os campos continuam editáveis — é só preenchimento inicial.

Depois de aplicar, teste convertendo um lead com squad, canais e MRR 
preenchidos, confirme que tudo aparece pré-preenchido no popup, e me 
devolva a lista de arquivos alterados.`}
      </div>
    </div>
  );
}
