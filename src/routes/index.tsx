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
- Altere APENAS o componente de toggle "Status" (Ativo/Inativo) na 
  listagem de Gestão de Clientes e a função que salva essa mudança. Não 
  altere outras colunas (Nicho, Canais, Health Score, Risco), nem o 
  modal de edição de cliente.
- RLS explícito de UPDATE na tabela clients para o campo de status, caso 
  ainda não exista.
- Antes de corrigir, confirme: o campo de status do cliente já existe 
  na tabela (ex: \`is_active\` boolean, ou \`status\` texto)? O clique no 
  toggle está de fato disparando uma chamada ao servidor, ou é só um 
  toggle visual sem estado conectado ao banco?

O QUE FAZER:

1. Corrigir o toggle para que, ao clicar, ele realmente atualize o campo 
   de status do cliente no banco via server function (contexto 
   autenticado, seguindo o mesmo padrão já corrigido em outros módulos).

2. Cores do toggle:
   - Ativo: fundo verde #22C55E, bolinha à direita.
   - Inativo: fundo vermelho #EF4444, bolinha à esquerda.

3. Confirmar com SELECT real, depois do clique, que o valor mudou no 
   banco — não confiar apenas na mudança visual do toggle.

4. Se desativar um cliente tiver alguma implicação em outras telas (ex: 
   não aparecer mais em listagens de "clientes ativos" usadas em outros 
   módulos), me avise antes de implementar qualquer filtro adicional — 
   não presuma esse comportamento sem confirmação.

Depois de aplicar, teste clicando no toggle de um cliente, recarregue a 
página (F5) e confirme que o status mudou e PERSISTIU (não voltou ao 
estado anterior). Me devolva o resultado do diagnóstico inicial e a 
lista de arquivos alterados.`}
      </div>
    </div>
  );
}
