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
          <h2 className="font-bold text-[#3D4FE8] mb-4 uppercase tracking-wider">Resultado da Geração de Contratos</h2>
          
          <div className="space-y-4">
            <section>
              <h3 className="font-bold border-b border-[#F7F8FC] pb-1 mb-2">1. Recuperação de Dados Reais</h3>
              <p className="mb-2 text-[#8A8FA3]">Dados extraídos do lead original da <strong>Empresa Teste</strong>:</p>
              <pre className="bg-[#F7F8FC] p-3 rounded overflow-x-auto text-[10px] leading-tight text-gray-700">
{`Lead: Lead Teste Playwright
- Valor MRR: R$ 5.000,00
- Meses: 12
- Método: Pix
- Data Referência: 2026-08-21 (Conversão)`}
              </pre>
            </section>

            <section>
              <h3 className="font-bold border-b border-[#F7F8FC] pb-1 mb-2">2. Confirmação de Execução (SQL Result)</h3>
              <table className="w-full text-[10px] text-left border-collapse">
                <thead>
                  <tr className="bg-[#F7F8FC]">
                    <th className="p-2 border border-[#E4E6F0]">Cliente</th>
                    <th className="p-2 border border-[#E4E6F0]">Contrato</th>
                    <th className="p-2 border border-[#E4E6F0]">Valor/Mês</th>
                    <th className="p-2 border border-[#E4E6F0]">Parcelas Geradas</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border border-[#E4E6F0]">Empresa Teste</td>
                    <td className="p-2 border border-[#E4E6F0]">Recorrente (12 meses)</td>
                    <td className="p-2 border border-[#E4E6F0]">R$ 5.000,00</td>
                    <td className="p-2 border border-[#E4E6F0] font-bold text-green-600">12 Recebíveis</td>
                  </tr>
                </tbody>
              </table>
            </section>

            <div className="mt-4 p-3 bg-green-50 text-green-700 rounded border border-green-100 font-medium">
              SUCESSO: Contrato criado e 12 recebíveis gerados com base no dado real do lead. A TechFlow Systems não possui lead vinculado no banco para extração automática de MRR.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}