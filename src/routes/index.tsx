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
- Altere APENAS a lógica de submit do ClientRegistrationModal.tsx, 
  especificamente a decisão entre criar (INSERT) e atualizar (UPDATE) 
  cliente. Não altere os campos do formulário nem o payload em si, que 
  já está correto.
- Pode remover o console.log de debug temporário depois de confirmar a 
  correção.

DIAGNÓSTICO CONFIRMADO:
A requisição está sendo enviada como PATCH para 
\`/clients?id=eq.undefined\` — ou seja, o código está chamando a função de 
ATUALIZAR um cliente existente, mas o ID do cliente está undefined 
porque esse cliente ainda não foi criado. Isso acontece ao converter um 
lead em cliente NOVO — deveria ser um INSERT (criar), não um UPDATE 
(atualizar).

O QUE FAZER:

1. Encontre no ClientRegistrationModal.tsx (ou na função de submit que 
   ele chama) a lógica que decide entre criar e atualizar cliente. 
   Corrija para que, no fluxo de CONVERSÃO DE LEAD, sempre seja feito um 
   INSERT (criação de cliente novo), nunca um UPDATE — a menos que o 
   modal também seja reaproveitado para editar cliente já existente, 
   caso em que a lógica precisa checar corretamente se já existe um 
   \`client.id\` válido antes de decidir qual operação fazer.

2. Depois do INSERT bem-sucedido, usar o ID retornado pelo Supabase para 
   qualquer operação seguinte (ex: criar o registro em \`contracts\` com o 
   monthly_value).

3. Remover o console.log de debug do payload (já cumpriu seu papel).

Depois de aplicar, teste convertendo o mesmo lead de novo e confirme que 
o cliente é criado sem erro de UUID. Me devolva a lista de arquivos 
alterados.`}
      </div>
    </div>
  );
}
