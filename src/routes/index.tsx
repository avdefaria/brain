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
- Não corrija nada ainda. Apenas adicione log temporário e me devolva o 
  resultado.

O QUE FAZER:

1. No ClientRegistrationModal.tsx, antes de enviar o payload de criação/
   atualização de cliente para o servidor, adicione um console.log 
   completo (JSON.stringify) de TODOS os campos do payload, incluindo 
   valores undefined explicitamente visíveis (use 
   JSON.stringify(payload, (key, value) => value === undefined ? "UNDEFINED_AQUI" : value)).

2. Reproduza o erro (tente converter o mesmo lead que está dando erro) e 
   me cole aqui o conteúdo EXATO desse console.log — todos os campos e 
   valores, sem resumir ou interpretar.

3. Também me mostre a linha exata do código no server 
   (createServerFn/handler de criação de cliente) onde o INSERT ou 
   UPDATE no Supabase é executado, para eu confirmar qual campo da 
   tabela está recebendo o "undefined".`}
      </div>
    </div>
  );
}
