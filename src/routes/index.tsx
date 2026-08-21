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
Preciso apenas de esclarecimento, sem alterar nada ainda:

1. Mostre o trecho de código EXATO que verifica "não possui recebíveis" 
   antes de gerar novos registros — a query ou condição usada para 
   decidir se deve gerar ou pular.

2. O que acontece especificamente se eu editar um cliente já existente 
   (que já tem contrato e recebíveis gerados) e mudar apenas o campo 
   Nicho, sem tocar em MRR/Meses? A lógica de geração é chamada de novo? 
   Ela detecta que já existem recebíveis e pula, ou existe risco de 
   duplicar?

3. Explique o que é o mecanismo de "diretrizes visuais" no 
   src/routes/index.tsx que está sendo atualizado repetidamente em 
   quase todos os prompts — é um arquivo de notas/instruções que você 
   mesmo mantém, ou é código que afeta a tela renderizada para o 
   usuário final?
      </div>
    </div>
  );
}
