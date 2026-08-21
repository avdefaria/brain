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
    <div className="flex min-h-screen items-center justify-center bg-[#F7F8FC]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-8 bg-[#3D4FE8] rounded-full flex items-center justify-center animate-pulse">
          <div className="w-4 h-4 bg-white rounded-full"></div>
        </div>
        
        <div className="max-w-2xl p-6 bg-white rounded-xl border border-[#E4E6F0] shadow-sm text-sm font-sans text-[#0E0E16]">
          <h2 className="font-bold text-[#3D4FE8] mb-4 uppercase tracking-wider">Resultado do Diagnóstico Técnico</h2>
          
          <div className="space-y-4">
            <section>
              <h3 className="font-bold border-b border-[#F7F8FC] pb-1 mb-2">1. Dados dos Clientes (TechFlow & Empresa Teste)</h3>
              <pre className="bg-[#F7F8FC] p-3 rounded overflow-x-auto text-[10px] leading-tight text-gray-700">
{`[TechFlow Systems]
- ID: 1b7bd635-ad7d-42af-b389-4cf5b4b8d1b0
- Início: 2026-08-19 | Fim Exp: 2026-09-30
- Status: active
- Canais: [Mídia Paga, Social Media]
- Contrato/Financeiro: DADOS AUSENTES NO DB (Tabela contracts e receivables vazias)

[Empresa Teste - CONVERSÃO]
- ID: 1810cd3e-1d59-4057-b383-8dacb1689633
- Início: 2026-08-21 | Fim Exp: 2027-07-31
- Status: inactive (Cancelado em 21/08 - Motivo: Teste)
- Lead Vinculado: 4568b5b2-d814-4e0a-93e9-cb015571c14a`}
              </pre>
            </section>

            <section>
              <h3 className="font-bold border-b border-[#F7F8FC] pb-1 mb-2">2. Localização do Valor Real (Lead Originário)</h3>
              <p className="mb-2 italic text-[#8A8FA3]">{"O valor real digitado na conversão do lead \"Empresa Teste\" está em:"}</p>
              <pre className="bg-[#F7F8FC] p-3 rounded overflow-x-auto text-[10px] leading-tight text-gray-700">
{`Tabela: public.leads
- recurring_revenue: 5000 (R$ 5.000,00)
- one_time_revenue: 0
- mrr_months: 12
- funnel_stage: vendas_feitas`}
              </pre>
            </section>

            <section>
              <h3 className="font-bold border-b border-[#F7F8FC] pb-1 mb-2">3. Análise de Tabelas Vinculadas (client_id)</h3>
              <p className="mb-2 italic text-[#8A8FA3]">Tabelas com client_id como FK:</p>
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                {["contracts", "receivables", "client_sales_channels", "accounts", "project_deliveries", "tasks", "content_posts", "special_projects", "client_public_access"].map(t => (
                  <span key={t} className="bg-[#F7F8FC] px-2 py-1 rounded border border-[#E4E6F0] text-gray-600">{t}</span>
                ))}
              </div>
            </section>

            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded border border-red-100 font-medium">
              DIAGNÓSTICO: O valor foi salvo no Lead, mas a persistência na tabela "contracts" (que gera os recebíveis) falhou ou não foi executada para estes registros.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}