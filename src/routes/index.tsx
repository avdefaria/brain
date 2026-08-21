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
- Altere APENAS a lógica de carregamento de dados ao abrir o modal de 
  edição de cliente a partir de "Gestão de Clientes" → Editar. Não altere 
  o fluxo de conversão de lead (LeadConversionModal), nem a listagem de 
  Gestão de Clientes que já está exibindo os dados corretos.
- Antes de corrigir, me diga: o botão "Editar" em Gestão de Clientes está 
  abrindo o componente ClientRegistrationModal.tsx (o mesmo usado na 
  conversão de lead) ou existe um componente separado de edição de 
  cliente? Se for o mesmo componente reaproveitado, confirme se ele tem 
  lógica para diferenciar "criando a partir de lead" vs "editando cliente 
  já existente".

O QUE FAZER:

1. Se for o mesmo componente reaproveitado: corrigir para que, ao abrir 
   em modo EDIÇÃO (cliente já existe, não veio de conversão de lead), 
   ele carregue os dados REAIS do cliente do banco — incluindo Canais de 
   Vendas (via JOIN com a tabela de junção do cliente) e Valor Mensal 
   (MRR) do contrato — e NÃO tente puxar dados de um lead.

2. Corrigir também o título do modal: deve mostrar "Editar Cliente" 
   quando estiver editando, e "Converter Lead em Cliente" apenas quando 
   estiver de fato convertendo um lead novo.

3. Confirme com SELECT real que os dados de Canais de Vendas e MRR 
   realmente existem salvos no banco para os clientes "Empresa Teste - 
   CONVERSÃO" e "TechFlow Systems" antes de mexer no carregamento (para 
   confirmar que o problema é só de leitura/exibição, não de persistência).

Depois de aplicar, teste abrindo "Editar" em um cliente que já tem canais 
e MRR salvos, e confirme que os campos aparecem preenchidos corretamente. 
Me devolva a resposta do diagnóstico e a lista de arquivos alterados.`}
      </div>
    </div>
  );
}
