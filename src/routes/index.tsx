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
          <h2 className="font-bold text-[#3D4FE8] mb-4 uppercase tracking-wider">Diagnóstico Técnico: TechFlow Systems</h2>
          
          <div className="space-y-4">
            <section>
              <h3 className="font-bold border-b border-[#F7F8FC] pb-1 mb-2">1. Dados do Cliente</h3>
              <pre className="bg-[#F7F8FC] p-3 rounded overflow-x-auto text-[10px] leading-tight text-gray-700">
{`Cliente: TechFlow Systems
ID: 1b7bd635-ad7d-42af-b389-4cf5b4b8d1b0
lead_id: NULL (Confirmado)
Data Criação: 2026-08-19 21:10
Status: active
CNPJ: 12.345.678/0001-90`}
              </pre>
            </section>

            <section>
              <h3 className="font-bold border-b border-[#F7F8FC] pb-1 mb-2">2. Conclusão do lead_id</h3>
              <p className="text-gray-600 italic">
                O campo <strong>lead_id</strong> deste cliente é nulo. Isso confirma que a TechFlow Systems foi criada via <strong>cadastro direto</strong> (manual) e não através de uma conversão de lead do CRM.
              </p>
            </section>

            <section>
              <h3 className="font-bold border-b border-[#F7F8FC] pb-1 mb-2">3. Por que foi pulado no backfill?</h3>
              <div className="p-3 bg-amber-50 text-amber-700 rounded border border-amber-100">
                <p className="mb-2"><strong>Motivo:</strong> Ausência de fonte de dados financeira real.</p>
                <p>Como o cliente não possui vínculo com lead, não há registro de <code>recurring_revenue</code> ou <code>mrr_months</code> no banco de dados para este ID. Seguindo a regra de "Não inventar valores", o sistema não pode assumir um MRR para gerar os recebíveis sem uma entrada manual ou vínculo de lead.</p>
              </div>
            </section>

            <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded border border-blue-100 font-medium text-center">
              Aguardando definição manual de MRR/Meses para este cliente.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}